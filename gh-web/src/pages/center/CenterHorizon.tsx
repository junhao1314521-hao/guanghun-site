/**
 * 首屏大气光晕：单个全屏三角形的 WebGL 片元着色器（无三方库）。
 *
 * 为什么不用 CSS blur：
 * - 大面积 blur 会开合成层、低端机掉帧，深色渐变还容易出现色带；
 * - 着色器里直接算分层高斯 + 大气散射 + 极光噪声 + 抖动噪点，
 *   亮度更连续、层次更接近真实大气，且只占一个 draw call。
 *
 * 降级：WebGL 不可用 / 减少动效时退回静态首帧，不阻塞页面。
 */
import { useEffect, useRef } from 'react'
import { observeResize, observeVisibility, prefersReducedMotion } from './canvasEnv'

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv - 0.5;
  p.x *= uRes.x / uRes.y;

  // 深空底色：顶部更暗，接近地平线略微抬亮
  vec3 top = vec3(0.006, 0.010, 0.024);
  vec3 mid = vec3(0.020, 0.045, 0.098);
  vec3 sky = mix(top, mid, smoothstep(0.0, 0.92, uv.y));

  // 地平线位置：随指针做极轻微视差
  float horizon = 0.34 + uPointer.y * 0.010;
  float dy = uv.y - horizon;

  // 大气散射：窄带 + 宽带两层高斯，避免「塑料光斑」
  float band = exp(-abs(dy) * 24.0);
  float wide = exp(-abs(dy) * 4.4);
  vec3 glowCool = vec3(0.10, 0.34, 0.82);
  vec3 glowWarm = vec3(0.10, 0.62, 0.92);
  vec3 glowCol = mix(glowCool, glowWarm, smoothstep(-0.18, 0.16, dy));
  // 水平方向的亮度起伏：避免地平线像一条均匀的灯带
  float glowVar = 0.72 + 0.56 * fbm(vec2(uv.x * 2.2 + 1.7, 0.45));
  vec3 col = sky;
  col += glowCol * band * 0.40 * glowVar;
  col += vec3(0.022, 0.085, 0.200) * wide * 0.95;
  // 远处光源的柔和泛光：给地平线一个视觉落点
  float bloom = exp(-length((uv - vec2(0.46, horizon)) * vec2(1.35, 3.6)) * 3.1);
  col += glowCol * bloom * 0.16;

  // 地平线以下的低空薄雾：让光晕有「地面」而不是一条悬空的线
  float ground = smoothstep(horizon, 0.02, uv.y);
  col += vec3(0.007, 0.018, 0.040) * ground * 0.55;

  // 极光帘幕：低频 fbm，只在低强度区间出现，避免「彩色雾」
  float t = uTime * 0.045;
  vec2 q = vec2(uv.x * 1.9 + t + uPointer.x * 0.03, uv.y * 2.6 - t * 0.55);
  float curtain = smoothstep(0.52, 0.86, fbm(q * 1.35));
  float maskY = smoothstep(0.70, 0.22, uv.y) * smoothstep(0.04, 0.22, uv.y);
  col += vec3(0.035, 0.30, 0.46) * curtain * maskY * 0.26;

  // 地平线高光：一条很细的冷光，控制强度避免过曝
  float line = exp(-abs(dy) * 120.0);
  col += vec3(0.30, 0.72, 1.0) * line * 0.18;

  // 稀疏星点 + 呼吸闪烁（只在上半部分出现）
  vec2 sp = uv * vec2(uRes.x / uRes.y, 1.0) * 230.0;
  vec2 cell = floor(sp);
  float h = hash(cell);
  float star = step(0.9968, h);
  float twinkle = 0.55 + 0.45 * sin(uTime * 1.4 + h * 30.0);
  float dist = length(fract(sp) - 0.5);
  float starMask = smoothstep(0.16, 0.0, dist) * smoothstep(0.34, 0.55, uv.y);
  col += vec3(0.72, 0.86, 1.0) * star * starMask * twinkle * 0.75;

  // 暗角：把注意力收回中间
  float vig = smoothstep(1.25, 0.20, length(p * vec2(0.92, 1.06)));
  col *= 0.58 + 0.52 * vig;

  // 抖动噪点：消除 8-bit 色带，同时给一点胶片颗粒
  float grain = hash(gl_FragCoord.xy + fract(uTime) * 431.0) - 0.5;
  col += grain * 0.014;

  gl_FragColor = vec4(col, 1.0);
}
`

// 地平线背景：用 WebGL 着色器绘制动态画面，不支持时回退 CSS 渐变
export function CenterHorizon({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let gl: WebGLRenderingContext | null = null
    try {
      gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
      })
    } catch {
      canvas.dataset.fallback = 'true'
      return
    }
    // WebGL 不可用：保留 CSS 渐变兜底，不抛错
    if (!gl) {
      canvas.dataset.fallback = 'true'
      return
    }

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) {
      canvas.dataset.fallback = 'true'
      return
    }

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.dataset.fallback = 'true'
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, 'uRes')
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uPointer = gl.getUniformLocation(program, 'uPointer')

    const reduce = prefersReducedMotion()
    let width = 0
    let height = 0
    let raf = 0
    let visible = true
    let pointerX = 0
    let pointerY = 0
    let targetX = 0
    let targetY = 0
    const start = performance.now()

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = Math.max(1, Math.round(rect.width * dpr))
      height = Math.max(1, Math.round(rect.height * dpr))
      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, width, height)
    }

    const render = (now: number) => {
      pointerX += (targetX - pointerX) * 0.05
      pointerY += (targetY - pointerY) * 0.05
      gl.uniform2f(uRes, width, height)
      gl.uniform1f(uTime, reduce ? 0 : (now - start) / 1000)
      gl.uniform2f(uPointer, pointerX, pointerY)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(render)
    }

    const onPointer = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 2
      targetY = (event.clientY / window.innerHeight - 0.5) * 2
    }

    const stopResize = observeResize(canvas, resize)

    const stopVisibility = observeVisibility(canvas, (isVisible) => {
      visible = isVisible
      cancelAnimationFrame(raf)
      if (visible) raf = requestAnimationFrame(render)
    })

    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && visible) raf = requestAnimationFrame(render)
    }

    window.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      stopResize()
      stopVisibility()
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
