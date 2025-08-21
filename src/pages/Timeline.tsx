import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Heart, Calendar, User } from 'lucide-react';
import { Link } from 'react-router-dom';

// Mock memory data - in real app, this would come from your database
const mockMemories = [
  {
    id: 1,
    date: '2024-01-15',
    title: 'Sunday morning with Mom',
    preview: 'The smell of pancakes filled the kitchen as Mom hummed her favorite song...',
    recipient: 'Mom',
    themes: ['family', 'comfort', 'tradition']
  },
  {
    id: 2,
    date: '2024-01-10',
    title: 'First day at the new job',
    preview: 'Walking through those glass doors, I felt a mixture of excitement and nervousness...',
    recipient: null,
    themes: ['growth', 'career', 'courage']
  },
  {
    id: 3,
    date: '2024-01-08',
    title: 'Evening walk with Sarah',
    preview: 'The sunset painted the sky in shades of amber as we talked about our dreams...',
    recipient: 'Sarah',
    themes: ['love', 'dreams', 'nature']
  },
  {
    id: 4,
    date: '2024-01-05',
    title: 'Grandpa\'s stories',
    preview: 'He told me about the war again, but this time I really listened...',
    recipient: 'Future generations',
    themes: ['wisdom', 'history', 'family legacy']
  },
  {
    id: 5,
    date: '2024-01-03',
    title: 'New Year reflections',
    preview: 'Sitting by the window with my coffee, I thought about all the moments that shaped me...',
    recipient: null,
    themes: ['reflection', 'growth', 'gratitude']
  }
];

const Timeline = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  // Get unique recipients and themes for filtering
  const allRecipients = Array.from(new Set(mockMemories.filter(m => m.recipient).map(m => m.recipient)));
  const allThemes = Array.from(new Set(mockMemories.flatMap(m => m.themes)));

  // Filter memories based on search and filters
  const filteredMemories = mockMemories.filter(memory => {
    const matchesSearch = searchTerm === '' || 
      memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      memory.preview.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = selectedFilter === null ||
      memory.recipient === selectedFilter ||
      memory.themes.includes(selectedFilter);
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-sanctuary p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 pt-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to sanctuary
            </Button>
          </Link>
        </div>

        <div className="text-center space-y-4">
          <Calendar className="w-10 h-10 mx-auto text-love gentle-float" />
          <h1 className="text-3xl md:text-4xl font-light text-foreground">
            Your Timeline
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Journey through the memories you've preserved, each one a precious moment in your story.
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="memory-card">
          <CardContent className="p-6 space-y-4">
            
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search your memories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-sanctuary border-muted focus:border-memory transition-colors"
              />
            </div>

            {/* Filter Tags */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedFilter === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFilter(null)}
                  className="text-xs"
                >
                  All memories
                </Button>
                
                {/* Recipient filters */}
                {allRecipients.map(recipient => (
                  <Button
                    key={recipient}
                    variant={selectedFilter === recipient ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFilter(selectedFilter === recipient ? null : recipient)}
                    className="text-xs"
                  >
                    <User className="w-3 h-3 mr-1" />
                    {recipient}
                  </Button>
                ))}

                {/* Theme filters */}
                {allThemes.slice(0, 6).map(theme => (
                  <Button
                    key={theme}
                    variant={selectedFilter === theme ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFilter(selectedFilter === theme ? null : theme)}
                    className="text-xs capitalize"
                  >
                    {theme}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memory Cards */}
        <div className="space-y-4">
          {filteredMemories.length === 0 ? (
            <Card className="memory-card">
              <CardContent className="p-12 text-center">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No memories found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters, or create a new memory to start your timeline.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredMemories.map(memory => (
              <Card key={memory.id} className="memory-card cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    
                    {/* Date */}
                    <div className="flex-shrink-0">
                      <div className="text-sm text-muted-foreground">
                        {formatDate(memory.date)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      <h3 className="text-xl font-medium text-foreground group-hover:text-memory transition-colors">
                        {memory.title}
                      </h3>
                      
                      <p className="text-muted-foreground line-clamp-2">
                        {memory.preview}
                      </p>

                      <div className="flex flex-wrap gap-2 items-center">
                        {memory.recipient && (
                          <Badge variant="secondary" className="bg-love/20 text-love-foreground border-love/30">
                            <Heart className="w-3 h-3 mr-1" />
                            For {memory.recipient}
                          </Badge>
                        )}
                        
                        {memory.themes.slice(0, 3).map(theme => (
                          <Badge key={theme} variant="outline" className="text-xs capitalize">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Add Memory CTA */}
        <Card className="memory-card bg-gradient-to-r from-memory/10 to-love/10 border-memory/20">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-medium text-foreground mb-2">
              Ready to preserve another moment?
            </h3>
            <p className="text-muted-foreground mb-4">
              Every memory you share becomes part of your lasting legacy.
            </p>
            <Link to="/add-memory">
              <Button className="bg-memory hover:bg-memory/90 text-memory-foreground">
                <Heart className="w-4 h-4 mr-2" />
                Add New Memory
              </Button>
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Timeline;