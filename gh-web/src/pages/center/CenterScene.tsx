/**
 * 交互演示画面：纯 WebGL 片元着色器绘制的「雨夜城市」。
 * 拖动亮度 / 对比度 / 饱和度 / 色调 / 色温时，画面实时调色，
 * 不使用任何图片素材，也不画几何风景插画。
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
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uHue;
uniform float uTemp;

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

vec3 hueRotate(vec3 color, float angle) {
  const vec3 k = vec3(0.57735);
  float c = cos(angle);
  float s = sin(angle);
  return color * c + cross(k, color) * s + k * dot(k, color) * (1.0 - c);
}

vec3 cityScene(vec2 uv) {
  // 夜空与地平线雾：地平线更亮，才能把建筑剪影托出来
  vec3 sky = mix(vec3(0.010, 0.018, 0.040), vec3(0.045, 0.095, 0.180), smoothstep(0.0, 0.80, uv.y));
  sky += vec3(0.10, 0.18, 0.36) * exp(-abs(uv.y - 0.34) * 5.0) * 0.95;

  // 两层城市剪影：按楼块取高度，形成明确的建筑轮廓
  float bh1 = 0.24 + 0.17 * hash(vec2(floor(uv.x * 16.0), 7.0));
  float bh2 = 0.15 + 0.13 * hash(vec2(floor(uv.x * 28.0) + 3.0, 11.0));
  float city1 = step(uv.y, bh1);
  float city2 = step(uv.y, bh2);

  vec3 col = sky;
  col = mix(col, vec3(0.016, 0.026, 0.052), city1 * 0.94);
  col = mix(col, vec3(0.006, 0.010, 0.024), city2 * 0.97);

  // 楼顶轮廓的冷光，让剪影有边缘而不糊成一片
  float rim = exp(-abs(uv.y - bh1) * 380.0) * city1;
  col += vec3(0.10, 0.24, 0.46) * rim * 0.42;

  // 楼体窗灯：网格 + 随机点亮，只出现在楼体范围内
  vec2 g = vec2(uv.x * 104.0, uv.y * 72.0);
  vec2 id = floor(g);
  vec2 f = fract(g);
  float lit = step(0.78, hash(id));
  float win = lit * step(0.22, f.x) * step(f.x, 0.62) * step(0.25, f.y) * step(f.y, 0.65);
  win *= step(uv.y, bh1 - 0.03) * step(0.03, uv.y);
  vec3 winCol = mix(vec3(1.0, 0.70, 0.34), vec3(0.48, 0.78, 1.0), hash(id + 3.1));
  col += winCol * win * 0.62;

  // 三层散景光斑：数量更少、半径更大，避免看成星空
  for (int layer = 0; layer < 3; layer++) {
    float scale = 9.0 + float(layer) * 7.0;
    vec2 bp = uv * scale;
    vec2 bi = floor(bp);
    vec2 bf = fract(bp) - 0.5;
    float h = hash(bi + float(layer) * 19.0);
    float r = 0.12 + 0.26 * fract(h * 7.0);
    float d = length(bf);
    float circle = smoothstep(r, r * 0.25, d);
    float twinkle = 0.78 + 0.22 * sin(uTime * 0.55 + h * 28.0);
    vec3 bokehCol = mix(vec3(0.20, 0.55, 1.0), vec3(1.0, 0.52, 0.26), fract(h * 13.0));
    float heightMask = smoothstep(0.62, 0.34, uv.y);
    col += bokehCol * circle * step(0.95, h) * (0.28 - float(layer) * 0.06) * twinkle * heightMask;
  }

  // 湿润地面：底部反射天际线与窗灯
  float ground = smoothstep(0.17, 0.0, uv.y);
  float streak = fbm(vec2(uv.x * 36.0, uv.y * 3.4 + uTime * 0.03));
  col += vec3(0.10, 0.22, 0.44) * ground * streak * 0.30;
  col += vec3(0.05, 0.12, 0.24) * exp(-abs(uv.y - 0.17) * 26.0) * 0.55;

  // 细雨
  vec2 rp = vec2(floor(uv.x * 230.0), floor((uv.y + uTime * 0.42) * 34.0));
  col += vec3(0.55, 0.72, 1.0) * step(0.9965, hash(rp)) * 0.16;

  return col;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv - 0.5;
  p.x *= uRes.x / uRes.y;

  vec3 col = cityScene(uv);

  // 调色：饱和度 → 对比度 → 亮度 → 色温 → 色调
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, uSaturation);
  col = (col - 0.16) * uContrast + 0.16;
  col *= uBrightness;
  vec3 warm = vec3(1.07, 0.99, 0.90);
  vec3 cool = vec3(0.90, 0.97, 1.08);
  col *= mix(warm, cool, clamp(uTemp * 0.5 + 0.5, 0.0, 1.0));
  col = hueRotate(col, uHue * 3.1415926 / 180.0);

  // 暗角与颗粒
  float vig = smoothstep(1.15, 0.28, length(p * vec2(0.92, 1.05)));
  col *= 0.60 + 0.50 * vig;
  float grain = hash(gl_FragCoord.xy + fract(uTime) * 317.0) - 0.5;
  col += grain * 0.014;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`

type Props = {
  brightness: number
  contrast: number
  saturation: number
  hue: number
  temperature: number
  className?: string
}

export function CenterScene({ brightness, contrast, saturation, hue, temperature, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const valuesRef = useRef({ brightness, contrast, saturation, hue, temperature })

  // 控件变化时写入 ref，动画循环每帧读取，避免重建 WebGL 上下文
  useEffect(() => {
    valuesRef.current = { brightness, contrast, saturation, hue, temperature }
  }, [brightness, contrast, saturation, hue, temperature])

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
      return
    }
    if (!gl) return
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
    if (!vs || !fs) return

    const program = context.createProgram()
    if (!program) return
    context.attachShader(program, vs)
    context.attachShader(program, fs)
    context.linkProgram(program)
    if (!context.getProgramParameter(program, context.LINK_STATUS)) return
    context.useProgram(program)

    const buffer = context.createBuffer()
    context.bindBuffer(context.ARRAY_BUFFER, buffer)
    context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), context.STATIC_DRAW)
    const aPos = context.getAttribLocation(program, 'aPos')
    context.enableVertexAttribArray(aPos)
    context.vertexAttribPointer(aPos, 2, context.FLOAT, false, 0, 0)

    const uniforms = {
      res: context.getUniformLocation(program, 'uRes'),
      time: context.getUniformLocation(program, 'uTime'),
      brightness: context.getUniformLocation(program, 'uBrightness'),
      contrast: context.getUniformLocation(program, 'uContrast'),
      saturation: context.getUniformLocation(program, 'uSaturation'),
      hue: context.getUniformLocation(program, 'uHue'),
      temp: context.getUniformLocation(program, 'uTemp'),
    }

    const reduce = prefersReducedMotion()
    let width = 0
    let height = 0
    let raf = 0
    let visible = true
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
      const v = valuesRef.current
      context.uniform2f(uniforms.res, width, height)
      context.uniform1f(uniforms.time, reduce ? 0 : (now - start) / 1000)
      context.uniform1f(uniforms.brightness, 0.55 + (v.brightness / 100) * 0.9)
      context.uniform1f(uniforms.contrast, 0.70 + (v.contrast / 100) * 0.6)
      context.uniform1f(uniforms.saturation, v.saturation / 50)
      context.uniform1f(uniforms.hue, v.hue - 50)
      context.uniform1f(uniforms.temp, (v.temperature - 50) / 50)
      context.drawArrays(context.TRIANGLES, 0, 3)
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(render)
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
    document.addEventListener('visibilitychange', onVisibility)
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      stopResize()
      stopVisibility()
      document.removeEventListener('visibilitychange', onVisibility)
      context.deleteProgram(program)
      context.deleteBuffer(buffer)
      context.deleteShader(vs)
      context.deleteShader(fs)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
