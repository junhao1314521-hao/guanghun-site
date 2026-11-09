/**
 * 产品 3D 预览（详情页主图区专用）。
 *
 * - **按需加载**：组件挂载后才动态引入 three / GLTFLoader，不点 3D 的用户完全不下载；
 * - **单文件 .glb**：贴图需内嵌；支持 Draco 压缩（解码器随站点静态资源一起发，见 public/draco）；
 * - **观感**：影棚环境光 + 柔光阴影 + 自动缓慢自转；拖动可旋转，松手有惯性，双击复位；
 * - **降级**：不支持 WebGL / 模型加载失败 → 回调 `onError`，由父级切回实拍图；
 *   `prefers-reduced-motion` 下取消自转与惯性。
 *
 * 模型约定（与后台字段提示一致）：Y 轴向上、正面朝 +Z、原点在底座中心、单位米。
 * 组件会按包围盒自动缩放到画面内并把底部对齐到地面，因此原点略偏也不会悬空。
 */
import { useEffect, useRef, useState } from 'react'

/** WebGL 可用性探测（缓存结果：同一会话内不重复创建上下文） */
let webglSupport: boolean | null = null
function hasWebGL(): boolean {
  if (webglSupport !== null) return webglSupport
  try {
    const canvas = document.createElement('canvas')
    webglSupport = Boolean(
      canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'),
    )
  } catch {
    webglSupport = false
  }
  return webglSupport
}

/** 当前设备是否具备 WebGL：详情页据此决定是否渲染 3D 入口（不支持时按钮直接不出现，避免点了才消失） */
export function supports3D(): boolean {
  return hasWebGL()
}

type Props = {
  /** .glb 地址 */
  src: string
  /** 首帧渲染完成（父级据此淡出封面图） */
  onReady?: () => void
  /** 初始化 / 加载失败（父级据此切回实拍图并隐藏 3D 入口） */
  onError?: () => void
  /** 数值变化即把视角复位到初始角度 */
  resetSignal?: number
  /** 无障碍描述 */
  label?: string
}

/** 产品 3D 画布：拖动旋转 + 自动自转 + 双击复位 */
export function ProductModel3D({ src, onReady, onError, resetSignal = 0, label }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const resetRef = useRef<() => void>(() => {})
  const readyRef = useRef(onReady)
  const errorRef = useRef(onError)
  readyRef.current = onReady
  errorRef.current = onError

  // 复位信号：通过 ref 调用场景内部的复位函数（避免把 three 对象放进 React 状态）
  useEffect(() => {
    if (resetSignal > 0) resetRef.current()
  }, [resetSignal])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (!hasWebGL()) {
      setFailed(true)
      errorRef.current?.()
      return
    }

    let disposed = false
    let cleanup = () => {}

    ;(async () => {
      const [THREE, gltfMod, dracoMod, roomMod] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/loaders/DRACOLoader.js'),
        import('three/examples/jsm/environments/RoomEnvironment.js'),
      ])
      if (disposed) return

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.02
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.domElement.className = 'pd3d__canvas'
      host.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
      camera.position.set(0, 1.05, 4.2)

      // 影棚环境：中性柔光，让 PBR 金属 / 玻璃有层次，而不是死黑
      const pmrem = new THREE.PMREMGenerator(renderer)
      const envTexture = pmrem.fromScene(new roomMod.RoomEnvironment(), 0.06).texture
      scene.environment = envTexture
      scene.environmentIntensity = 0.85

      const key = new THREE.DirectionalLight(0xffffff, 2.4)
      key.position.set(2.6, 3.4, 2.4)
      key.castShadow = true
      key.shadow.mapSize.set(1024, 1024)
      key.shadow.camera.near = 0.5
      key.shadow.camera.far = 12
      key.shadow.camera.left = -2.4
      key.shadow.camera.right = 2.4
      key.shadow.camera.top = 2.4
      key.shadow.camera.bottom = -2.4
      key.shadow.bias = -0.0006
      key.shadow.radius = 4
      scene.add(key)
      const fill = new THREE.DirectionalLight(0x9fc0ff, 0.9)
      fill.position.set(-3, 1.6, 1.2)
      scene.add(fill)
      const rim = new THREE.DirectionalLight(0xbcd2ff, 1.6)
      rim.position.set(0, 2.2, -3.4)
      scene.add(rim)

      // 地面接收阴影（只渲染阴影，不遮挡背景）
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(4, 64),
        new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.34 }),
      )
      ground.rotation.x = -Math.PI / 2
      ground.receiveShadow = true
      scene.add(ground)

      const pivot = new THREE.Group()
      scene.add(pivot)

      /** 初始视角（略微侧转，能看到面板厚度与支架体积） */
      const HOME = { x: -0.06, y: -0.42 }
      let rotX = HOME.x
      let rotY = HOME.y
      let velX = 0
      let velY = 0
      let dragging = false
      let lastX = 0
      let lastY = 0
      let idleSince = performance.now()
      let autoSpin = !reduceMotion
      let raf = 0
      let ready = false

      const applyRotation = () => {
        pivot.rotation.x = rotX
        pivot.rotation.y = rotY
      }

      const resetView = () => {
        rotX = HOME.x
        rotY = HOME.y
        velX = 0
        velY = 0
        applyRotation()
        idleSince = performance.now()
        autoSpin = !reduceMotion
      }
      resetRef.current = resetView

      /** 按包围盒缩放到画面内：最大边约 2.1，底部贴地，水平居中 */
      const fitModel = (object: import('three').Object3D) => {
        object.updateWorldMatrix(true, true)
        const box = new THREE.Box3().setFromObject(object)
        if (box.isEmpty()) return
        const size = new THREE.Vector3()
        const center = new THREE.Vector3()
        box.getSize(size)
        box.getCenter(center)
        const maxSide = Math.max(size.x, size.y, size.z) || 1
        const scale = 2.1 / maxSide
        object.scale.setScalar(scale)
        // 重新测量（scale 后），把「水平居中 + 底部落地」做在 pivot 上
        object.updateWorldMatrix(true, true)
        const box2 = new THREE.Box3().setFromObject(object)
        const center2 = new THREE.Vector3()
        const size2 = new THREE.Vector3()
        box2.getCenter(center2)
        box2.getSize(size2)
        object.position.x -= center2.x
        object.position.z -= center2.z
        object.position.y -= box2.min.y

        // 相机取景：按包围球半径算距离，留 12% 余量
        const radius = Math.max(size2.x, size2.y, size2.z) * 0.5
        const fov = (camera.fov * Math.PI) / 180
        const dist = (radius / Math.sin(fov / 2)) * 1.12
        camera.position.set(0, size2.y * 0.52, dist)
        camera.lookAt(0, size2.y * 0.5, 0)
        key.position.set(size2.x * 1.6, size2.y * 2.2, size2.z * 1.6)
        key.target.position.set(0, size2.y * 0.4, 0)
        scene.add(key.target)
      }

      const draco = new dracoMod.DRACOLoader()
      // 与站点同源，避免依赖外网 CDN；只在模型确实用 Draco 压缩时才真正请求解码器
      draco.setDecoderPath('/draco/')
      const loader = new gltfMod.GLTFLoader()
      loader.setDRACOLoader(draco)

      loader.load(
        src,
        (gltf) => {
          if (disposed) return
          const model = gltf.scene
          model.traverse((child) => {
            const mesh = child as import('three').Mesh
            if (mesh.isMesh) {
              mesh.castShadow = true
              mesh.receiveShadow = true
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
              for (const material of materials) {
                if (!material) continue
                const standard = material as import('three').MeshStandardMaterial
                if ('envMapIntensity' in standard) standard.envMapIntensity = 0.9
                material.needsUpdate = true
              }
            }
          })
          pivot.add(model)
          fitModel(model)
          applyRotation()
          ready = true
          readyRef.current?.()
        },
        undefined,
        () => {
          if (disposed) return
          setFailed(true)
          errorRef.current?.()
        },
      )

      /* ---------- 交互：拖动旋转 + 惯性 ---------- */
      const el = renderer.domElement
      const onDown = (event: PointerEvent) => {
        dragging = true
        autoSpin = false
        lastX = event.clientX
        lastY = event.clientY
        velX = 0
        velY = 0
        el.setPointerCapture(event.pointerId)
        el.classList.add('is-dragging')
      }
      const onMove = (event: PointerEvent) => {
        if (!dragging) return
        const dx = event.clientX - lastX
        const dy = event.clientY - lastY
        lastX = event.clientX
        lastY = event.clientY
        rotY += dx * 0.007
        rotX = Math.max(-0.42, Math.min(0.42, rotX + dy * 0.005))
        velY = dx * 0.007
        velX = dy * 0.005
        applyRotation()
      }
      const onUp = (event: PointerEvent) => {
        if (!dragging) return
        dragging = false
        idleSince = performance.now()
        if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId)
        el.classList.remove('is-dragging')
      }
      const onDouble = () => resetView()
      el.addEventListener('pointerdown', onDown)
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
      el.addEventListener('pointercancel', onUp)
      el.addEventListener('dblclick', onDouble)

      /* ---------- 尺寸 ---------- */
      const resize = () => {
        const w = host.clientWidth || 1
        const h = host.clientHeight || 1
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        // 窄屏收紧垂直取景，避免产品上下被裁
        camera.fov = w / h < 0.95 ? 36 : 30
        camera.updateProjectionMatrix()
      }
      resize()
      const observer = new ResizeObserver(resize)
      observer.observe(host)

      /* ---------- 渲染循环 ---------- */
      const clock = new THREE.Clock()
      const tick = () => {
        if (disposed) return
        raf = requestAnimationFrame(tick)
        if (!ready) return
        const delta = Math.min(clock.getDelta(), 0.05)
        const now = performance.now()

        if (!dragging) {
          // 惯性：松手后按速度继续转一小段并衰减
          if (Math.abs(velY) > 0.0002 || Math.abs(velX) > 0.0002) {
            rotY += velY
            rotX = Math.max(-0.42, Math.min(0.42, rotX + velX))
            velY *= 0.94
            velX *= 0.9
            applyRotation()
            idleSince = now
          } else if (autoSpin && now - idleSince > 2600 && !reduceMotion) {
            // 空闲后缓慢自转，让静态主图有生命感
            rotY += delta * 0.16
            applyRotation()
          }
        }
        renderer.render(scene, camera)
      }
      tick()

      const onVisibility = () => {
        if (document.hidden) {
          cancelAnimationFrame(raf)
        } else if (!disposed) {
          clock.getDelta()
          tick()
        }
      }
      document.addEventListener('visibilitychange', onVisibility)

      cleanup = () => {
        cancelAnimationFrame(raf)
        observer.disconnect()
        document.removeEventListener('visibilitychange', onVisibility)
        el.removeEventListener('pointerdown', onDown)
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
        el.removeEventListener('pointercancel', onUp)
        el.removeEventListener('dblclick', onDouble)
        scene.traverse((child) => {
          const mesh = child as import('three').Mesh
          if (mesh.geometry) mesh.geometry.dispose()
          const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
          for (const material of materials) {
            for (const value of Object.values(material)) {
              const texture = value as import('three').Texture | null
              if (texture && texture.isTexture) texture.dispose()
            }
            material.dispose()
          }
        })
        envTexture.dispose()
        pmrem.dispose()
        draco.dispose()
        renderer.dispose()
        if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
      }
    })().catch(() => {
      if (!disposed) {
        setFailed(true)
        errorRef.current?.()
      }
    })

    return () => {
      disposed = true
      cleanup()
    }
  }, [src])

  if (failed) return null
  return <div className="pd3d__stage" ref={hostRef} role="img" aria-label={label ?? '产品 3D 预览'} />
}
