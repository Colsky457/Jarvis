import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function Reactor({ status }) {
  const mountRef = useRef(null)
  const stateRef = useRef({ status })

  useEffect(() => {
    stateRef.current.status = status
    const mount = mountRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.z = 4

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const coreGeo = new THREE.IcosahedronGeometry(1, 2)
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.6, wireframe: true })
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

    let raf
    const clock = new THREE.Clock()
    const animate = () => {
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
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={mountRef} className="reactor-canvas" />
}
