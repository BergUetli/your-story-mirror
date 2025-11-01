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
  const BASE_ROTATION_SPEED = 0.0005
  const PARTICLE_OPACITY = 1

  const IMAGE_SIZE = 1.5

  const groupRef = useRef<THREE.Group>(null)
  const [memoryTextures, setMemoryTextures] = useState<Map<string, THREE.Texture>>(new Map())
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const { raycaster, pointer, camera, gl } = useThree()

  // Load images for memories
  useEffect(() => {
    async function loadMemoryImages() {
      const textureMap = new Map<string, THREE.Texture>()
      
      for (const memory of memories.slice(0, 25)) {
        if (memory.image_urls && memory.image_urls.length > 0) {
          console.log('Loading image for memory:', memory.title, memory.image_urls)
          const signedUrls = await getSignedUrls('memory-images', memory.image_urls, 3600)
          console.log('Got signed URLs:', signedUrls)
          
          if (signedUrls[0]) {
            const loader = new THREE.TextureLoader()
            loader.crossOrigin = 'anonymous'
            loader.load(
              signedUrls[0],
              (texture) => {
                console.log('Texture loaded successfully for:', memory.title)
                setMemoryTextures(prev => {
                  const newMap = new Map(prev)
                  newMap.set(memory.id, texture)
                  return newMap
                })
              },
              undefined,
              (error) => {
                console.error('Error loading texture for memory:', memory.title, error)
              }
            )
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

      // Flip to face outward (no additional rotation needed, just flip Y)
      euler.y += Math.PI

      return {
        memory,
        position: [x, y, z] as [number, number, number],
        rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      }
    })
  }, [memories, SPHERE_RADIUS])

  // Handle clicks on memories and scroll for speed control
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

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      setSpeedMultiplier(prev => {
        const delta = event.deltaY > 0 ? -0.5 : 0.5
        const newSpeed = Math.max(0.5, Math.min(10, prev + delta))
        return newSpeed
      })
    }

    gl.domElement.addEventListener('click', handleClick)
    gl.domElement.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      gl.domElement.removeEventListener('click', handleClick)
      gl.domElement.removeEventListener('wheel', handleWheel)
    }
  }, [raycaster, pointer, camera, gl, onMemoryClick])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += BASE_ROTATION_SPEED * speedMultiplier
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
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          // If we have an image texture, draw it as background
          if (texture && texture.image) {
            ctx.drawImage(texture.image, 0, 0, 512, 512)
            
            // Add dark overlay for text readability
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
            ctx.fillRect(0, 0, 512, 512)
          } else {
            // Background gradient if no image
            const gradient = ctx.createLinearGradient(0, 0, 512, 512)
            gradient.addColorStop(0, '#1e3a8a')
            gradient.addColorStop(1, '#3b82f6')
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, 512, 512)
          }
          
          // Border
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 4
          ctx.strokeRect(10, 10, 492, 492)
          
          // Title
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 36px Arial, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          
          // Add text shadow for better readability
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
          ctx.shadowBlur = 8
          ctx.shadowOffsetX = 2
          ctx.shadowOffsetY = 2
          
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
              if (y > 300) break
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
          ctx.fillStyle = '#ffffff'
          ctx.fillText(date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }), 256, 420)
        }
        
        const compositeTexture = new THREE.CanvasTexture(canvas)
        
        return (
          <mesh 
            key={`memory-${item.memory.id}`} 
            position={item.position} 
            rotation={item.rotation}
            userData={{ isMemory: true, memory: item.memory }}
          >
            <planeGeometry args={[IMAGE_SIZE, IMAGE_SIZE]} />
            <meshBasicMaterial map={compositeTexture} transparent side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}
