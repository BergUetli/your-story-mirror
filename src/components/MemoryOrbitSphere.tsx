import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface Memory {
  id: string
  title: string
  text?: string
  image_urls?: string[]
  memory_date?: string
  created_at: string
}

interface MemoryOrbitSphereProps {
  memories: Memory[]
}

export function MemoryOrbitSphere({ memories }: MemoryOrbitSphereProps) {
  const PARTICLE_COUNT = 1500
  const PARTICLE_SIZE_MIN = 0.005
  const PARTICLE_SIZE_MAX = 0.010
  const SPHERE_RADIUS = 9
  const POSITION_RANDOMNESS = 4
  const ROTATION_SPEED_Y = 0.0005
  const PARTICLE_OPACITY = 1

  const IMAGE_SIZE = 1.5

  const groupRef = useRef<THREE.Group>(null)

  const particles = useMemo(() => {
    const particles = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT)
      const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi

      const radiusVariation = SPHERE_RADIUS + (Math.random() - 0.5) * POSITION_RANDOMNESS

      const x = radiusVariation * Math.cos(theta) * Math.sin(phi)
      const y = radiusVariation * Math.cos(phi)
      const z = radiusVariation * Math.sin(theta) * Math.sin(phi)

      particles.push({
        position: [x, y, z] as [number, number, number],
        scale: Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN) + PARTICLE_SIZE_MIN,
        color: new THREE.Color().setHSL(
          Math.random() * 0.1 + 0.05,
          0.8,
          0.6 + Math.random() * 0.3,
        ),
      })
    }

    return particles
  }, [PARTICLE_COUNT, SPHERE_RADIUS, POSITION_RANDOMNESS, PARTICLE_SIZE_MIN, PARTICLE_SIZE_MAX])

  const orbitingMemories = useMemo(() => {
    if (!memories || memories.length === 0) return []

    const memoryCount = Math.min(memories.length, 25)
    const memoriesToDisplay = memories.slice(0, memoryCount)

    return memoriesToDisplay.map((memory, i) => {
      const angle = (i / memoryCount) * Math.PI * 2
      const x = SPHERE_RADIUS * Math.cos(angle)
      const y = 0
      const z = SPHERE_RADIUS * Math.sin(angle)

      const position = new THREE.Vector3(x, y, z)
      const center = new THREE.Vector3(0, 0, 0)
      const outwardDirection = position.clone().sub(center).normalize()

      const euler = new THREE.Euler()
      const matrix = new THREE.Matrix4()
      matrix.lookAt(position, position.clone().add(outwardDirection), new THREE.Vector3(0, 1, 0))
      euler.setFromRotationMatrix(matrix)

      euler.z += Math.PI

      return {
        memory,
        position: [x, y, z] as [number, number, number],
        rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      }
    })
  }, [memories, SPHERE_RADIUS])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += ROTATION_SPEED_Y
    }
  })

  return (
    <group ref={groupRef}>
      {particles.map((particle, index) => (
        <mesh key={index} position={particle.position} scale={particle.scale}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color={particle.color} transparent opacity={PARTICLE_OPACITY} />
        </mesh>
      ))}

      {orbitingMemories.map((item, index) => (
        <mesh key={`memory-${item.memory.id}`} position={item.position} rotation={item.rotation}>
          <planeGeometry args={[IMAGE_SIZE, IMAGE_SIZE]} />
          <meshBasicMaterial color="#3b82f6" opacity={0.8} transparent side={THREE.DoubleSide}>
            <primitive 
              attach="map" 
              object={(() => {
                const canvas = document.createElement('canvas')
                canvas.width = 512
                canvas.height = 512
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.fillStyle = '#1e40af'
                  ctx.fillRect(0, 0, 512, 512)
                  ctx.fillStyle = '#ffffff'
                  ctx.font = 'bold 32px sans-serif'
                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'middle'
                  const title = item.memory.title.substring(0, 30)
                  ctx.fillText(title, 256, 256)
                }
                const texture = new THREE.CanvasTexture(canvas)
                return texture
              })()} 
            />
          </meshBasicMaterial>
        </mesh>
      ))}
    </group>
  )
}
