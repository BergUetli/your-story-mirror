import { useRef, useMemo, useState, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { getSignedUrls } from '@/lib/storage'

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
  onMemoryClick?: (memory: Memory) => void
}

export function MemoryOrbitSphere({ memories, onMemoryClick }: MemoryOrbitSphereProps) {
  const PARTICLE_COUNT = 1500
  const PARTICLE_SIZE_MIN = 0.005
  const PARTICLE_SIZE_MAX = 0.010
  const SPHERE_RADIUS = 9
  const POSITION_RANDOMNESS = 4
  const ROTATION_SPEED_Y = 0.0005
  const PARTICLE_OPACITY = 1

  const IMAGE_SIZE = 1.5

  const groupRef = useRef<THREE.Group>(null)
  const [memoryTextures, setMemoryTextures] = useState<Map<string, THREE.Texture>>(new Map())
  const { raycaster, pointer, camera, gl } = useThree()

  // Load images for memories
  useEffect(() => {
    async function loadMemoryImages() {
      const textureMap = new Map<string, THREE.Texture>()
      
      for (const memory of memories.slice(0, 25)) {
        if (memory.image_urls && memory.image_urls.length > 0) {
          const signedUrls = await getSignedUrls('memory-images', memory.image_urls, 3600)
          if (signedUrls[0]) {
            const loader = new THREE.TextureLoader()
            loader.load(signedUrls[0], (texture) => {
              textureMap.set(memory.id, texture)
              setMemoryTextures(new Map(textureMap))
            })
          }
        }
      }
    }
    
    if (memories.length > 0) {
      loadMemoryImages()
    }
  }, [memories])

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

  // Handle clicks on memories
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!groupRef.current || !onMemoryClick) return

      raycaster.setFromCamera(pointer, camera)
      const meshes = groupRef.current.children.filter(child => 
        child.userData.isMemory && child instanceof THREE.Mesh
      )
      
      const intersects = raycaster.intersectObjects(meshes)
      if (intersects.length > 0) {
        const memory = intersects[0].object.userData.memory
        if (memory) {
          onMemoryClick(memory)
        }
      }
    }

    gl.domElement.addEventListener('click', handleClick)
    return () => gl.domElement.removeEventListener('click', handleClick)
  }, [raycaster, pointer, camera, gl, onMemoryClick])

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

      {orbitingMemories.map((item, index) => {
        const texture = memoryTextures.get(item.memory.id)
        
        // If we have an image texture, use it
        if (texture) {
          return (
            <mesh 
              key={`memory-${item.memory.id}`} 
              position={item.position} 
              rotation={item.rotation}
              userData={{ isMemory: true, memory: item.memory }}
            >
              <planeGeometry args={[IMAGE_SIZE, IMAGE_SIZE]} />
              <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
            </mesh>
          )
        }
        
        // Otherwise create a text-based card
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          // Background gradient
          const gradient = ctx.createLinearGradient(0, 0, 512, 512)
          gradient.addColorStop(0, '#1e3a8a')
          gradient.addColorStop(1, '#3b82f6')
          ctx.fillStyle = gradient
          ctx.fillRect(0, 0, 512, 512)
          
          // Border
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 4
          ctx.strokeRect(10, 10, 492, 492)
          
          // Title
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 36px Arial, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          
          // Word wrap the title
          const words = item.memory.title.split(' ')
          let line = ''
          let y = 60
          const maxWidth = 450
          const lineHeight = 44
          
          for (let word of words) {
            const testLine = line + word + ' '
            const metrics = ctx.measureText(testLine)
            if (metrics.width > maxWidth && line !== '') {
              ctx.fillText(line.trim(), 256, y)
              line = word + ' '
              y += lineHeight
              if (y > 300) break // Limit to prevent overflow
            } else {
              line = testLine
            }
          }
          if (y <= 300) {
            ctx.fillText(line.trim(), 256, y)
          }
          
          // Date
          const date = new Date(item.memory.memory_date || item.memory.created_at)
          ctx.font = '24px Arial, sans-serif'
          ctx.fillStyle = '#e0e7ff'
          ctx.fillText(date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }), 256, 420)
        }
        
        const textTexture = new THREE.CanvasTexture(canvas)
        
        return (
          <mesh 
            key={`memory-${item.memory.id}`} 
            position={item.position} 
            rotation={item.rotation}
            userData={{ isMemory: true, memory: item.memory }}
          >
            <planeGeometry args={[IMAGE_SIZE, IMAGE_SIZE]} />
            <meshBasicMaterial map={textTexture} transparent side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}
