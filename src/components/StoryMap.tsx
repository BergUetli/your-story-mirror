import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StoryMapProps {
  memories: any[];
  profile: any;
}

interface LifeNarrative {
  opening: string;
  milestones: string[];
  closing: string;
}

interface ThemeNode {
  id: string;
  title: string;
  year: number;
  x: number;
  y: number;
}

interface ThemeConnection {
  from: string;
  to: string;
}

// Classic life themes with associated keywords
const LIFE_THEMES = {
  'Love & Relationships': ['love', 'relationship', 'marriage', 'wedding', 'partner', 'dating', 'romance', 'family', 'friendship', 'together'],
  'Career & Professional': ['work', 'job', 'career', 'professional', 'promotion', 'business', 'office', 'project', 'meeting', 'colleague'],
  'Achievements & Success': ['achievement', 'success', 'accomplished', 'won', 'award', 'graduated', 'diploma', 'certificate', 'milestone', 'proud'],
  'Struggles & Challenges': ['struggle', 'challenge', 'difficult', 'hard', 'problem', 'issue', 'obstacle', 'setback', 'tough', 'overcome'],
  'Growth & Learning': ['learn', 'growth', 'develop', 'education', 'course', 'training', 'skill', 'knowledge', 'study', 'improve'],
  'Travel & Adventure': ['travel', 'trip', 'vacation', 'journey', 'adventure', 'explore', 'visit', 'destination', 'abroad', 'flight'],
  'Health & Wellness': ['health', 'fitness', 'exercise', 'wellness', 'medical', 'doctor', 'hospital', 'recovery', 'healing', 'therapy'],
  'Creativity & Hobbies': ['creative', 'hobby', 'art', 'music', 'painting', 'writing', 'craft', 'project', 'passion', 'interest'],
};

const StoryMap = ({ memories, profile }: StoryMapProps) => {
  const [narrative, setNarrative] = useState<LifeNarrative | null>(null);
  const availableThemes = Object.keys(LIFE_THEMES);
  const [selectedTheme, setSelectedTheme] = useState<string>(availableThemes[0]);
  const [themeNodes, setThemeNodes] = useState<ThemeNode[]>([]);
  const [themeConnections, setThemeConnections] = useState<ThemeConnection[]>([]);

  // Generate life narrative
  useEffect(() => {
    if (!profile) {
      setNarrative(null);
      return;
    }

    // Calculate age
    let age: number | null = null;
    let birthYear = '';
    if (profile?.birth_date) {
      const birthDate = new Date(profile.birth_date);
      birthYear = birthDate.getFullYear().toString();
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Opening paragraph - birth and origin (biographical style)
    let opening = '';
    const name = profile.name || 'This person';
    const possessive = name === 'This person' ? 'their' : `${name}'s`;
    const pronoun = name === 'This person' ? 'they' : name;
    
    if (profile.birth_date && profile.birth_place) {
      opening = `Born in ${birthYear} in ${profile.birth_place}, ${possessive} journey began like all great stories—with possibility.`;
    } else if (profile.birth_date) {
      opening = `The year was ${birthYear}. ${possessive} story had just begun.`;
    } else if (profile.birth_place) {
      opening = `${profile.birth_place} was where it all started—a beginning that would unfold into something remarkable.`;
    } else {
      opening = `Every life is a story waiting to be told. This one is still being written.`;
    }

    // Extract major milestones from memories
    const majorKeywords = [
      'graduated', 'graduation', 'married', 'marriage', 'wedding',
      'born', 'birth', 'child', 'baby', 
      'college', 'university', 'degree', 'moved', 'new job', 'promoted',
      'promotion', 'started', 'founded'
    ];

    const milestoneMemories = memories
      .filter((memory: any) => {
        const text = (memory.title + ' ' + (memory.text || '')).toLowerCase();
        return majorKeywords.some(keyword => text.includes(keyword));
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.memory_date || a.created_at);
        const dateB = new Date(b.memory_date || b.created_at);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5); // Top 5 major events

    // Create flowing narrative sentences from milestones
    const milestoneSentences = milestoneMemories.map((memory: any, index: number) => {
      const year = new Date(memory.memory_date || memory.created_at).getFullYear();
      const location = memory.memory_location ? ` in ${memory.memory_location}` : '';
      const title = memory.title;
      
      // Vary sentence structure for natural flow
      const patterns = [
        `${year} marked a turning point${location}—${title.toLowerCase()}.`,
        `Then came ${year}${location}, when ${title.toLowerCase()}.`,
        `In ${year}${location}, ${title.toLowerCase()}—a chapter that would shape everything to come.`,
        `${year}${location}: ${title}.`,
      ];
      
      return patterns[index % patterns.length];
    });

    // Closing - biographical, forward-looking (only if we have milestones)
    let closing = '';
    
    if (milestoneSentences.length > 0) {
      closing = `The story continues to unfold, each day adding new depth to a life lived with intention and purpose.`;
    } else {
      // If not enough significant memories, keep it brief
      closing = `A life in motion, with chapters yet to be written.`;
    }

    setNarrative({
      opening,
      milestones: milestoneSentences,
      closing,
    });
  }, [memories, profile]);

  // Generate knowledge graph when theme is selected
  useEffect(() => {
    if (!selectedTheme || memories.length === 0) {
      setThemeNodes([]);
      setThemeConnections([]);
      return;
    }

    // Get keywords for the selected theme
    const keywords = LIFE_THEMES[selectedTheme as keyof typeof LIFE_THEMES] || [];

    // Find all memories related to the selected theme based on keywords
    const relatedMemories = memories.filter((memory: any) => {
      const text = (memory.title + ' ' + (memory.text || '')).toLowerCase();
      const tags = (memory.tags || []).map((t: string) => t.toLowerCase());
      
      // Check if any keyword matches the memory text or tags
      return keywords.some(keyword => 
        text.includes(keyword.toLowerCase()) || 
        tags.some((tag: string) => tag.includes(keyword.toLowerCase()))
      );
    }).sort((a: any, b: any) => {
      const dateA = new Date(a.memory_date || a.created_at);
      const dateB = new Date(b.memory_date || b.created_at);
      return dateA.getTime() - dateB.getTime();
    });

    if (relatedMemories.length === 0) {
      setThemeNodes([]);
      setThemeConnections([]);
      return;
    }

    // Create nodes positioned in a flowing timeline
    const nodes: ThemeNode[] = relatedMemories.map((memory: any, index: number) => {
      const year = new Date(memory.memory_date || memory.created_at).getFullYear();
      const totalNodes = relatedMemories.length;
      
      // Position nodes in a flowing pattern (sine wave)
      const xProgress = index / Math.max(totalNodes - 1, 1);
      const x = 50 + xProgress * 400; // Spread across width
      const y = 100 + Math.sin(xProgress * Math.PI * 2) * 40; // Sine wave pattern
      
      return {
        id: memory.id,
        title: memory.title,
        year,
        x,
        y,
      };
    });

    // Create connections between consecutive memories
    const connections: ThemeConnection[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      connections.push({
        from: nodes[i].id,
        to: nodes[i + 1].id,
      });
    }

    setThemeNodes(nodes);
    setThemeConnections(connections);
  }, [selectedTheme, memories]);


  if (!narrative) {
    return (
      <Card className="h-full modern-card border border-border p-8 flex flex-col items-center justify-center bg-card animate-fade-in shadow-soft">
        <h3 className="text-2xl font-semibold text-card-foreground mb-4">Your Story</h3>
        <p className="text-muted-foreground text-center max-w-sm">
          Complete your profile and add memories to see your journey
        </p>
      </Card>
    );
  }

  return (
    <Card className="h-full modern-card border border-border p-8 bg-card animate-fade-in shadow-soft overflow-auto">
      <div className="flex flex-col space-y-8">
        {/* Title */}
        <div>
          <h3 className="text-3xl font-semibold text-card-foreground mb-2">Your Story So Far</h3>
          <p className="text-sm text-muted-foreground italic">A journey of growth and possibility</p>
        </div>

        {/* Opening - Birth & Beginning */}
        <div className="space-y-4">
          <p className="text-base leading-relaxed text-card-foreground">
            {narrative.opening}
          </p>
        </div>

        {/* Major Milestones */}
        {narrative.milestones.length > 0 && (
          <div className="space-y-4">
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="space-y-3">
              {narrative.milestones.map((milestone, index) => (
                <p key={index} className="text-base leading-relaxed text-card-foreground pl-4 border-l-2 border-primary/50">
                  {milestone}
                </p>
              ))}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        )}

        {/* Closing - Forward Looking */}
        <div className="space-y-4">
          <p className="text-base leading-relaxed text-card-foreground font-medium">
            {narrative.closing}
          </p>
        </div>

        {/* Theme Explorer */}
        {availableThemes.length > 0 && (
          <div className="space-y-4">
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-card-foreground">Explore Your Themes</h4>
              <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                <SelectTrigger className="w-full bg-background border border-input">
                  <SelectValue placeholder="Select a theme to explore" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {availableThemes.map((theme) => (
                    <SelectItem key={theme} value={theme}>
                      {theme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Knowledge Graph Visualization */}
            {themeNodes.length > 0 && (
              <div className="relative h-48 bg-muted/30 rounded-lg border border-border p-4 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="xMidYMid meet">
                  {/* Draw connections */}
                  {themeConnections.map((conn, index) => {
                    const fromNode = themeNodes.find(n => n.id === conn.from);
                    const toNode = themeNodes.find(n => n.id === conn.to);
                    if (!fromNode || !toNode) return null;
                    
                    return (
                      <line
                        key={index}
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke="hsl(var(--primary))"
                        strokeWidth="1.5"
                        strokeOpacity="0.3"
                      />
                    );
                  })}
                  
                  {/* Draw nodes */}
                  {themeNodes.map((node, index) => (
                    <g key={node.id}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="8"
                        fill="hsl(var(--primary))"
                        stroke="white"
                        strokeWidth="2"
                        className="transition-all hover:r-10 cursor-pointer"
                      />
                      <text
                        x={node.x}
                        y={node.y - 15}
                        textAnchor="middle"
                        fontSize="10"
                        fill="hsl(var(--card-foreground))"
                        className="pointer-events-none"
                      >
                        {node.year}
                      </text>
                      {index === 0 && (
                        <text
                          x={node.x}
                          y={node.y + 25}
                          textAnchor="middle"
                          fontSize="9"
                          fill="hsl(var(--muted-foreground))"
                          className="pointer-events-none"
                        >
                          First
                        </text>
                      )}
                      {index === themeNodes.length - 1 && (
                        <text
                          x={node.x}
                          y={node.y + 25}
                          textAnchor="middle"
                          fontSize="9"
                          fill="hsl(var(--muted-foreground))"
                          className="pointer-events-none"
                        >
                          Latest
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
                
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {themeNodes.length} {themeNodes.length === 1 ? 'memory' : 'memories'} connected by "{selectedTheme}"
                </p>
              </div>
            )}
            
            {themeNodes.length === 0 && selectedTheme && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No memories found for "{selectedTheme}"
              </div>
            )}
          </div>
        )}

        {/* Caption */}
        <p className="text-xs text-muted-foreground text-center mt-6 italic">
          Each memory adds another constellation to your life's archive.
        </p>
      </div>
    </Card>
  );
};

export default StoryMap;
