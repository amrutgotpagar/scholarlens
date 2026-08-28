import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SHEETS = 5

function Sheet({ index }: { index: number }) {
  const mesh = useRef<THREE.Mesh>(null)
  // Deterministic fan-out per sheet, not random — same reasoning as the graph's
  // node layout: stable across re-renders, no per-mount reshuffle.
  const angle = (index - (SHEETS - 1) / 2) * 0.09
  const offset = (index - (SHEETS - 1) / 2) * 0.035

  return (
    <mesh ref={mesh} position={[offset, -index * 0.02, index * 0.01]} rotation={[0, 0, angle]}>
      <planeGeometry args={[1.5, 2]} />
      <meshBasicMaterial
        color={index === SHEETS - 1 ? '#ffffff' : '#c7d2fe'}
        transparent
        opacity={index === SHEETS - 1 ? 1 : 0.22 + index * 0.05}
        side={THREE.DoubleSide}
      />
      {index === SHEETS - 1 && (
        <group position={[0, 0, 0.01]}>
          {[0.55, 0.3, 0.05, -0.2, -0.45].map((y, i) => (
            <mesh key={i} position={[i % 2 === 0 ? -0.05 : 0.05, y, 0]}>
              <planeGeometry args={[i === 0 ? 0.9 : 1.1, 0.06]} />
              <meshBasicMaterial color="#6366f1" transparent opacity={0.35} />
            </mesh>
          ))}
        </group>
      )}
    </mesh>
  )
}

function Scene() {
  const group = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * 0.12
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.06
  })

  return (
    <group ref={group} rotation={[0.25, -0.4, 0]}>
      {Array.from({ length: SHEETS }, (_, i) => (
        <Sheet key={i} index={i} />
      ))}
    </group>
  )
}

/** A small stack of fanned "paper" planes — the literal subject of the product,
 * rendered as a real object rather than an icon. Same lightweight pattern as
 * RetrievalGraph3D: mounted once, its own isolated WebGL context, no postprocessing. */
export function DocumentStack3D() {
  return (
    <div className="aspect-square w-full">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.5], fov: 40 }} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}
