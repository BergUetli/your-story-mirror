import { useState, useEffect, useCallback, Suspense, useMemo } from 'react'
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { MemoryOrbitSphere } from '@/components/MemoryOrbitSphere'
import { MemoryDetailDialog } from '@/components/MemoryDetailDialog'
import { format } from 'date-fns'

export default function TimelineOrbit() {
  const { user } = useAuth()
  const [memories, setMemories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [canvasReady, setCanvasReady] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null)

  const fetchMemories = useCallback(async () => {
    const userId = user?.id || '00000000-0000-0000-0000-000000000000'

    try {
      setLoading(true)
      
      const { data: memoriesData, error: memoriesError } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (memoriesError) throw memoriesError

      setMemories(memoriesData || [])
    } catch (error) {
      console.error('Failed to fetch memories:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchMemories()
    }
  }, [user?.id, fetchMemories])

  useEffect(() => {
    // Ensure Canvas renders after component is fully mounted
    const timer = setTimeout(() => setCanvasReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const dateRange = useMemo(() => {
    if (memories.length === 0) return null
    
    const dates = memories.map(m => new Date(m.created_at)).sort((a, b) => a.getTime() - b.getTime())
    const earliest = dates[0]
    const latest = dates[dates.length - 1]
    
    return {
      start: format(earliest, 'MMM yyyy'),
      end: format(latest, 'MMM yyyy')
    }
  }, [memories])

  return (
    <div className="w-full h-screen bg-black relative">
      <nav className="absolute top-0 left-0 right-0 z-10 border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/timeline">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Timeline
              </Button>
            </Link>
            <h1 className="text-lg sm:text-xl font-semibold text-white">Memory Orbit</h1>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchMemories}
            disabled={loading}
            className="text-white hover:bg-white/10"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </nav>

      <div className="absolute top-20 left-0 right-0 z-10 px-6 pointer-events-none">
        <h2 className="max-w-[750px] mx-auto text-white text-center font-serif px-6 md:text-4xl text-2xl tracking-tight font-normal">
          {dateRange ? `Memories: ${dateRange.start} to ${dateRange.end}` : 'Memories'}
        </h2>
      </div>

      <div className="absolute bottom-6 left-6 z-10 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-lg border border-white/10 pointer-events-none">
        <p className="text-white text-sm">
          💡 <span className="font-semibold">Scroll</span> to adjust orbit speed
        </p>
      </div>

      {loading || !canvasReady ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-white animate-pulse">Loading memories...</div>
        </div>
      ) : memories.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-center space-y-4">
            <p className="text-xl">No memories yet</p>
            <Link to="/add-memory">
              <Button className="bg-primary hover:bg-primary/90">
                Add Your First Memory
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <Canvas camera={{ position: [-10, 1.5, 10], fov: 50 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <MemoryOrbitSphere memories={memories} onMemoryClick={setSelectedMemory} />
            <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
          </Suspense>
        </Canvas>
      )}

      {selectedMemory && (
        <MemoryDetailDialog
          memory={selectedMemory}
          open={!!selectedMemory}
          onOpenChange={(open) => !open && setSelectedMemory(null)}
          onUpdate={fetchMemories}
        />
      )}
    </div>
  )
}
