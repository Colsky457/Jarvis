import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const VALID_STATUSES = new Set(['idle', 'listening', 'hearing', 'speaking'])
const DEFAULT_STATUS = 'idle'
const MIN_DIMENSION = 1

export default function Reactor({ status }) {
  const mountRef = useRef(null)
  const stateRef = useRef({ status: DEFAULT_STATUS })

  // Validate the status prop so an invalid value cannot influence animation.
  const normalizedStatus = VALID_STATUSES.has(status) ? status : DEFAULT_STATUS

  // Keep the ref in sync with the prop. Refs are only written inside effects,
  // never during render, to satisfy the react-hooks/refs rule.
  useEffect(() => {
    stateRef.current.status = normalizedStatus
  }, [normalizedStatus])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer = null
    let raf = null
    let active = true

    try {
      const width = Math.max(MIN_DIMENSION, mount.clientWidth)
      const height = Math.max(MIN_DIMENSION, mount.clientHeight)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
      camera.position.z = 4

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      mount.appendChild(renderer.domElement)

      const group = new THREE.Group()
      scene.add(group)

      const coreGeo = new THREE.IcosahedronGeometry(1, 2)
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.6,
        wireframe: true,
      })
      const core = new THREE.Mesh(coreGeo, coreMat)
      group.add(core)

      const ringGeo = new THREE.TorusGeometry(1.6, 0.02, 16, 100)
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      group.add(ring)

      const light = new THREE.PointLight(0x38bdf8, 2, 10)
      light.position.set(2, 2, 2)
      scene.add(light)
      scene.add(new THREE.AmbientLight(0x404040, 1))

      const clock = new THREE.Clock()
      const animate = () => {
        if (!active) return
        raf = requestAnimationFrame(animate)
        const t = clock.getElapsedTime()
        const s = stateRef.current.status
        const speed = s === 'speaking' ? 3 : s === 'hearing' ? 2 : s === 'listening' ? 0.8 : 0.3
        core.rotation.x = t * speed * 0.5
        core.rotation.y = t * speed
        ring.rotation.z = t * speed * 0.7
        const pulse = 1 + 0.08 * Math.sin(t * (s === 'speaking' ? 8 : 3))
        core.scale.setScalar(pulse)
        renderer.render(scene, camera)
      }
      animate()

      const onResize = () => {
        const w = Math.max(MIN_DIMENSION, mount.clientWidth)
        const h = Math.max(MIN_DIMENSION, mount.clientHeight)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }

      const onContextLost = (event) => {
        event.preventDefault()
        cancelAnimationFrame(raf)
      }
      const onContextRestored = () => {
        animate()
      }

      window.addEventListener('resize', onResize)
      renderer.domElement.addEventListener('webglcontextlost', onContextLost)
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored)

      return () => {
        active = false
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', onResize)
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored)
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
        renderer.dispose()
      }
    } catch (err) {
      // WebGL unavailable (e.g. headless/test environment) — degrade gracefully
      // to an empty canvas instead of crashing the app.
      if (renderer) renderer.dispose()
      return
    }
    // Reactor mounts once; status changes are mirrored via stateRef above.
  }, [])

  return <div ref={mountRef} className="reactor-canvas" />
}
