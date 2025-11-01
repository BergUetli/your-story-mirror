import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface UnsplashImage {
  id: string
  urls: {
    small: string
    regular: string
    full: string
  }
  user: {
    name: string
  }
  description: string | null
}

interface UnsplashImageSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectImage: (imageUrl: string) => void
}

export function UnsplashImageSearch({ open, onOpenChange, onSelectImage }: UnsplashImageSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<UnsplashImage[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      // Note: User needs to add UNSPLASH_ACCESS_KEY to Supabase secrets
      // For now, using demo mode with placeholder
      const UNSPLASH_ACCESS_KEY = 'DEMO_KEY_PLACEHOLDER'
      
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=12`,
        {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to search images')
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('Error searching Unsplash:', error)
      // Show demo images for now
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (imageUrl: string) => {
    onSelectImage(imageUrl)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Search Stock Images</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for images... (e.g., 'New York skyline')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {results.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">Search for stock images to add to your memory</p>
              <p className="text-sm">
                Note: You'll need to add your Unsplash API key to use this feature.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {results.map((image) => (
              <button
                key={image.id}
                onClick={() => handleImageSelect(image.urls.regular)}
                className="relative aspect-square overflow-hidden rounded-lg border-2 border-transparent hover:border-primary transition-all group"
              >
                <img
                  src={image.urls.small}
                  alt={image.description || 'Unsplash image'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Photo by {image.user.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
