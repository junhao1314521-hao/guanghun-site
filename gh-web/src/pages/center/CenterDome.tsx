/**
 * 首屏穹顶：WebGL 片元着色器绘制弧形地平线（不是平直光带）。
 *
 * 弧线由「到圆心的距离」计算：圆心在画面下方，半径使弧顶落在视口约 28% 处，
 * 两侧自然沉入画面底部；再叠加两层高斯光晕、低频亮度起伏与抖动噪点。
 * WebGL 不可用时保留 CSS 渐变兜底。
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
  for (int i = 0; i < 5; i++) {
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
  float t = uTime;

  // 深海军蓝底色
  vec3 top = vec3(0.004, 0.008, 0.020);
  vec3 mid = vec3(0.014, 0.034, 0.078);
  vec3 sky = mix(top, mid, smoothstep(0.0, 0.95, uv.y));

  // 极光：两层低频噪声缓慢横向漂移，肉眼可见的流动感
  float a1 = fbm(vec2(uv.x * 2.1 + t * 0.045 + uPointer.x * 0.12, uv.y * 1.7 - t * 0.030 + uPointer.y * 0.08));
  float a2 = fbm(vec2(uv.x * 3.6 - t * 0.034, uv.y * 2.5 + t * 0.040));
  vec3 aurora = mix(vec3(0.03, 0.18, 0.62), vec3(0.06, 0.62, 0.86), a2);
  sky += aurora * smoothstep(0.48, 0.92, a1) * 0.20;
  sky += aurora * smoothstep(0.62, 0.98, a2) * 0.10;

  // 穹顶：圆心在画面下方，弧线随时间和鼠标呼吸
  float wob = 0.012 * sin(uv.x * 6.283 + t * 0.45) + 0.007 * sin(uv.x * 13.0 - t * 0.3);
  vec2 center = vec2(0.5 + uPointer.x * 0.035, 1.30 + 0.008 * sin(t * 0.18) + uPointer.y * 0.025);
  vec2 q = (uv - center) * vec2(1.0, 0.60);
  float d = length(q) - (0.62 + wob);

  float arc = exp(-abs(d) * 34.0);
  float halo = exp(-abs(d) * 7.5);
  float inside = smoothstep(0.03, -0.02, d);

  vec3 glowCool = vec3(0.05, 0.22, 0.70);
  vec3 glowWarm = vec3(0.12, 0.66, 1.0);
  vec3 glow = mix(glowCool, glowWarm, smoothstep(-0.22, 0.20, d));

  // 沿弧线的亮度流动，让光带像在缓慢呼吸
  float flow = 0.72 + 0.28 * sin(atan(q.y, q.x) * 4.0 - t * 1.2);

  vec3 col = sky;
  col += glow * arc * 0.95 * flow;
  col += glow * halo * 0.30;
  col += vec3(0.008, 0.026, 0.062) * inside;

  // 沿弧线横向扫过的一道高光
  float sweep = exp(-pow((uv.x - (0.5 + 0.42 * sin(t * 0.18))) * 3.2, 2.0)) * exp(-abs(d) * 4.5);
  col += vec3(0.18, 0.48, 1.0) * sweep * 0.28;

  // 空气尘埃 + 跟手光斑
  float dust = smoothstep(0.58, 0.95, fbm(uv * 3.4 + vec2(t * 0.02, 0.0)));
  col += vec3(0.06, 0.15, 0.32) * dust * inside * 0.18;
  float mouse = exp(-length((uv - (uPointer * 0.5 + 0.5)) * vec2(uRes.x / uRes.y, 1.0)) * 2.1);
  col += vec3(0.06, 0.16, 0.34) * mouse * 0.45;

  // 暗角
  float vig = smoothstep(1.18, 0.24, length(p * vec2(0.92, 1.05)));
  col *= 0.58 + 0.52 * vig;

  // 抖动噪点，消除 8-bit 色带
  float grain = hash(gl_FragCoord.xy + fract(t) * 431.0) - 0.5;
  col += grain * 0.012;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`

export function CenterDome({ className }: { className?: string }) {
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
    if (!gl) {
      canvas.dataset.fallback = 'true'
      return
    }
    const context = gl

    const compile = (type: number, source: string) => {
      const shader = context.createShader(type)
      if (!shader) return null
      context.shaderSource(shader, source)
      context.compileShader(shader)
      if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        context.deleteShader(shader)
        return null
      }
      return shader
    }

    const vs = compile(context.VERTEX_SHADER, VERT)
    const fs = compile(context.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) {
      canvas.dataset.fallback = 'true'
      return
    }

    const program = context.createProgram()
    if (!program) return
    context.attachShader(program, vs)
    context.attachShader(program, fs)
    context.linkProgram(program)
    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
      canvas.dataset.fallback = 'true'
      return
    }
    context.useProgram(program)

    const buffer = context.createBuffer()
    context.bindBuffer(context.ARRAY_BUFFER, buffer)
    context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), context.STATIC_DRAW)
    const aPos = context.getAttribLocation(program, 'aPos')
    context.enableVertexAttribArray(aPos)
    context.vertexAttribPointer(aPos, 2, context.FLOAT, false, 0, 0)

    const uRes = context.getUniformLocation(program, 'uRes')
    const uTime = context.getUniformLocation(program, 'uTime')
    const uPointer = context.getUniformLocation(program, 'uPointer')

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
      context.viewport(0, 0, width, height)
    }

    const render = (now: number) => {
      pointerX += (targetX - pointerX) * 0.04
      pointerY += (targetY - pointerY) * 0.04
      context.uniform2f(uRes, width, height)
      context.uniform1f(uTime, reduce ? 0 : (now - start) / 1000)
      context.uniform2f(uPointer, pointerX, pointerY)
      context.drawArrays(context.TRIANGLES, 0, 3)
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
      context.deleteProgram(program)
      context.deleteBuffer(buffer)
      context.deleteShader(vs)
      context.deleteShader(fs)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
