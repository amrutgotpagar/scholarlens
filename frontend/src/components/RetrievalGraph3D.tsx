import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'

const NODE_COUNT = 14

function makeNodes(seed: number) {
  // Deterministic pseudo-random placement on a sphere shell — avoids Math.random
  // so the layout is stable across re-renders/HMR instead of reshuffling.
  const nodes: THREE.Vector3[] = []
  for (let i = 0; i < NODE_COUNT; i++) {
    const t = i / NODE_COUNT
    const phi = Math.acos(1 - 2 * ((i + 0.5) / NODE_COUNT))
    const theta = Math.PI * (1 + Math.sqrt(5)) * i + seed
    const r = 1.9
    nodes.push(
      new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta) * 0.7,
        r * Math.cos(phi),
      ),
    )
    void t
  }
  return nodes
}

/** A thin glowing ring that sweeps top-to-bottom through the sphere — like the
 * reference component's scan line, but as real 3D content (so Bloom picks up
 * whatever it passes near) rather than a shader pass. A torus has genuine (if
 * tiny) tube thickness in every direction, so it stays visually thin from any
 * viewing angle — unlike a flat plane/ring, which only reads as "thin" exactly
 * edge-on and shows its full flat face (a big solid slab, not a line) the
 * moment it drifts off the camera's eye-level, which it constantly does since
 * it's animating. */
function ScanLine() {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const t = clock.getElapsedTime() * 0.4
    mesh.current.position.y = Math.sin(t) * 2.1
  })

  return (
    <mesh ref={mesh} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[2.2, 0.02, 8, 48]} />
      <meshBasicMaterial color="#fb7185" transparent opacity={0.6} />
    </mesh>
  )
}

function Scene() {
  const group = useRef<THREE.Group>(null)
  const nodes = useMemo(() => makeNodes(0.4), [])

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.15
  })

  return (
    <>
      <group ref={group}>
        <mesh>
          <icosahedronGeometry args={[0.55, 1]} />
          <meshBasicMaterial color="#818cf8" wireframe transparent opacity={0.5} />
        </mesh>
        {nodes.map((pos, i) => (
          <group key={i}>
            <Line points={[[0, 0, 0], [pos.x, pos.y, pos.z]]} color="#818cf8" transparent opacity={0.18} lineWidth={1} />
            <mesh position={pos}>
              <sphereGeometry args={[0.045, 12, 12]} />
              <meshBasicMaterial color={i % 5 === 0 ? '#c4b5fd' : '#a5b4fc'} />
            </mesh>
          </group>
        ))}
        <ScanLine />
      </group>
      <EffectComposer>
        <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={0.7} mipmapBlur />
      </EffectComposer>
    </>
  )
}

/** A small, deliberately cheap 3D visual — the embedding index as a node graph.
 * Just 14 nodes, no post-processing, capped DPR: mounted once at page load
 * rather than lazily on scroll-into-view, since that gate raced with React's
 * commit timing and could leave the canvas never rendering its first frame.
 * It's its own WebGL context, entirely separate from the hero's 2D canvas, so
 * it can't add to the scroll-scrub cost even though it starts immediately. */
export function RetrievalGraph3D() {
  return (
    <div className="aspect-square w-full">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.2], fov: 40 }} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}
