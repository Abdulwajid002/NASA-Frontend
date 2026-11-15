import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const C = { petrol: 0x142b2d, body: 0x21474a, ivory: 0xf6f0e4, apricot: 0xffa782, celadon: 0xb6d4c4 }

/* Camera / model keyframes for the three beats of the scroll sequence.
   x, y move the model inside the frame so the copy always has open space:
     wide:     model right -> left -> right (copy sits on the opposite side)
     portrait: model low  -> high -> low   (copy gets its own band above / below) */
const KEYS = {
  wide: [
    { z: 7.4, camY: 0.2, x: 3.0, y: 0.55, tilt: 0.42 },
    { z: 4.9, camY: 0.0, x: -2.35, y: -0.05, tilt: 0.18 },
    { z: 9.6, camY: 2.4, x: 3.1, y: -0.95, tilt: 0.62 },
  ],
  mid: [
    { z: 9.2, camY: 0.2, x: 1.7, y: -1.55, tilt: 0.42 },
    { z: 9.2, camY: 0.0, x: -0.6, y: 1.0, tilt: 0.18 },
    { z: 11.0, camY: 2.2, x: 1.6, y: -2.3, tilt: 0.62 },
  ],
  portrait: [
    { z: 10.2, camY: 0.2, x: 0.25, y: -2.15, tilt: 0.42 },
    { z: 10.4, camY: 0.0, x: -0.1, y: 1.3, tilt: 0.18 },
    { z: 12.5, camY: 2.0, x: 0.3, y: -3.1, tilt: 0.62 },
  ],
}
const modeFor = (w, h) => (w / h < 0.8 ? 'portrait' : w / h < 1.25 ? 'mid' : 'wide')
const ease = (t) => t * t * (3 - 2 * t)

function sample(keys, p) {
  const f = Math.min(Math.max(p, 0), 1) * (keys.length - 1)
  const i = Math.min(Math.floor(f), keys.length - 2)
  const t = ease(f - i)
  const a = keys[i], b = keys[i + 1], out = {}
  for (const k in a) out[k] = a[k] + (b[k] - a[k]) * t
  return out
}

function buildModel() {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 5),
    new THREE.MeshStandardMaterial({ color: C.body, roughness: 0.86, metalness: 0.08, flatShading: true }))
  g.add(body)
  const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.46, 2)),
    new THREE.LineBasicMaterial({ color: C.celadon, transparent: true, opacity: 0.34 }))
  g.add(shell)

  const ring = (r, tube, color, opacity, rx, rz) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 220),
      new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }))
    m.rotation.set(rx, 0, rz)
    return m
  }
  const orbitA = new THREE.Group()                               // apricot orbit carrying the station
  orbitA.rotation.set(Math.PI / 2.25, 0, 0.32)
  orbitA.add(ring(2.2, 0.007, C.apricot, 1, 0, 0))
  const station = new THREE.Group()
  station.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 12),
    new THREE.MeshStandardMaterial({ color: C.ivory, roughness: 0.5 })))
  for (const s of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.09),
      new THREE.MeshStandardMaterial({ color: C.apricot, roughness: 0.4, emissive: C.apricot, emissiveIntensity: 0.35 }))
    panel.position.x = s * 0.16
    station.add(panel)
  }
  station.position.set(2.2, 0, 0)
  const carrier = new THREE.Group()
  carrier.add(station)
  orbitA.add(carrier)
  g.add(orbitA)

  const orbitB = new THREE.Group()                               // faint ivory orbit with a small moon
  orbitB.rotation.set(Math.PI / 1.9, 0.5, -0.5)
  orbitB.add(ring(2.85, 0.004, C.ivory, 0.42, 0, 0))
  const moonCarrier = new THREE.Group()
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 20), new THREE.MeshStandardMaterial({ color: C.celadon, roughness: 0.6 }))
  moon.position.set(2.85, 0, 0)
  moonCarrier.add(moon)
  orbitB.add(moonCarrier)
  g.add(orbitB)
  return { g, body, shell, carrier, moonCarrier }
}

function buildStars() {
  const n = 700, pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = 26 + Math.random() * 30, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1)
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), -Math.abs(r * Math.cos(ph)) - 4], i * 3)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: C.ivory, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.7 }))
}

/**
 * Full-bleed WebGL scene. `getProgress()` returns 0..1 for the scroll sequence;
 * the camera and the model's place in the frame are interpolated from KEYS.
 */
export default function Scene({ getProgress, className = '' }) {
  const host = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = host.current
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    } catch {
      setFailed(true)
      return undefined
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(C.petrol, 1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(C.petrol, 14, 62)
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120)
    scene.add(new THREE.HemisphereLight(C.ivory, C.petrol, 0.75))
    const key = new THREE.DirectionalLight(0xffd9c2, 2.6)
    key.position.set(5, 4, 6)
    scene.add(key)
    const rim = new THREE.DirectionalLight(C.celadon, 1.5)
    rim.position.set(-6, -2, -4)
    scene.add(rim)
    const model = buildModel()
    scene.add(model.g, buildStars())

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let mode = 'wide', raf = 0, visible = true, last = performance.now(), spin = 0
    const cur = { ...KEYS.wide[0] }
    let first = true

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight
      if (!w || !h) return
      mode = modeFor(w, h)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      first = true
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(el)

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      if (!visible || document.hidden) { last = now; return }
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const p = getProgress ? getProgress() : 0
      const target = sample(KEYS[mode], p)
      const k = first ? 1 : 1 - Math.pow(0.0015, dt)          // frame-rate independent smoothing
      first = false
      for (const key2 in cur) cur[key2] += (target[key2] - cur[key2]) * k
      camera.position.set(0, cur.camY, cur.z)
      camera.lookAt(0, 0, 0)
      model.g.position.set(cur.x, cur.y, 0)
      if (!reduce) spin += dt
      model.g.rotation.set(cur.tilt, spin * 0.1 + p * Math.PI * 1.15, 0)
      model.shell.rotation.y = -spin * 0.05
      model.carrier.rotation.z = spin * 0.32 + p * 2.2
      model.moonCarrier.rotation.z = -spin * 0.2 - p * 1.4
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.() })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [getProgress])

  return (
    <div ref={host} aria-hidden="true" className={`absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full ${className}`}
      style={failed ? { background: 'radial-gradient(60% 60% at 72% 42%, #21474a 0%, #142B2D 62%)' } : undefined} />
  )
}
