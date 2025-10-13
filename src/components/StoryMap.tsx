import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

interface StoryMapProps {
  memories: any[];
  profile: any;
}

interface Milestone {
  label: string;
  date: string;
  position: number;
}

interface LifeNarrative {
  opening: string;
  milestones: string[];
  closing: string;
}

const StoryMap = ({ memories, profile }: StoryMapProps) => {
  const [narrative, setNarrative] = useState<LifeNarrative | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

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

    // Opening paragraph - birth and origin
    let opening = '';
    const name = profile.name || 'Your';
    
    if (profile.birth_date && profile.birth_place) {
      opening = `${name === 'Your' ? 'Your story' : `${name}'s story`} began in ${birthYear} in ${profile.birth_place}. `;
      if (age) {
        opening += `Now ${age} years into this journey, `;
      }
    } else if (profile.birth_date) {
      opening = `${name === 'Your' ? 'Your story' : `${name}'s story`} began in ${birthYear}. `;
      if (age) {
        opening += `${age} years of experiences and growth, `;
      }
    } else {
      opening = `${name === 'Your' ? 'Your' : `${name}'s`} journey unfolds with each passing day. `;
    }
    
    opening += `every moment leading to where ${name === 'Your' ? 'you are' : 'they are'} today.`;

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

    const milestoneSentences = milestoneMemories.map((memory: any) => {
      const year = new Date(memory.memory_date || memory.created_at).getFullYear();
      const location = memory.memory_location ? ` in ${memory.memory_location}` : '';
      return `In ${year}, ${memory.title.toLowerCase()}${location}—a defining moment in this journey.`;
    });

    // Closing - forward-looking and encouraging
    const totalMemories = memories.length;
    let closing = '';
    
    if (totalMemories > 50) {
      closing = `With over ${totalMemories} memories preserved, this archive tells a story of resilience, growth, and endless possibility. The best chapters are still being written.`;
    } else if (totalMemories > 20) {
      closing = `${totalMemories} precious memories captured so far, each one a stepping stone toward something greater. The journey continues, full of promise and potential.`;
    } else if (totalMemories > 5) {
      closing = `${totalMemories} moments preserved and counting. Each memory is proof of progress, a marker on the path to extraordinary things ahead.`;
    } else {
      closing = `Every great story starts with a single moment. Yours is just beginning, and the horizon is limitless.`;
    }

    setNarrative({
      opening,
      milestones: milestoneSentences,
      closing,
    });

    // Timeline milestones for visual
    const sortedMemories = [...memories].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const newMilestones: Milestone[] = [];
    
    if (sortedMemories.length > 0) {
      newMilestones.push({
        label: 'First Recording',
        date: new Date(sortedMemories[0].created_at).toLocaleDateString(),
        position: 0,
      });
    }

    if (sortedMemories.length > 0) {
      newMilestones.push({
        label: 'Latest Memory',
        date: new Date(sortedMemories[sortedMemories.length - 1].created_at).toLocaleDateString(),
        position: 100,
      });
    }

    setMilestones(newMilestones);
  }, [memories, profile]);


  if (!narrative) {
    return (
      <Card className="h-full modern-card border-[1.5px] border-black p-8 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white animate-fade-in">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Your Story</h3>
        <p className="text-muted-foreground text-center max-w-sm">
          Complete your profile and add memories to see your journey
        </p>
      </Card>
    );
  }

  return (
    <Card className="h-full modern-card border-[1.5px] border-black p-8 bg-gradient-to-br from-gray-50 to-white animate-fade-in shadow-elegant overflow-auto">
      <div className="flex flex-col space-y-8">
        {/* Title */}
        <div>
          <h3 className="text-3xl font-semibold text-foreground mb-2">Your Story So Far</h3>
          <p className="text-sm text-muted-foreground italic">A journey of growth and possibility</p>
        </div>

        {/* Opening - Birth & Beginning */}
        <div className="space-y-4">
          <p className="text-base leading-relaxed text-foreground">
            {narrative.opening}
          </p>
        </div>

        {/* Major Milestones */}
        {narrative.milestones.length > 0 && (
          <div className="space-y-4">
            <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <div className="space-y-3">
              {narrative.milestones.map((milestone, index) => (
                <p key={index} className="text-base leading-relaxed text-foreground pl-4 border-l-2 border-primary/30">
                  {milestone}
                </p>
              ))}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </div>
        )}

        {/* Closing - Forward Looking */}
        <div className="space-y-4">
          <p className="text-base leading-relaxed text-foreground font-medium">
            {narrative.closing}
          </p>
        </div>

        {/* Milestone Timeline */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Key Milestones</h4>
          <div className="relative h-20 bg-white/50 rounded-lg border-[1.5px] border-black/20 p-4">
            {/* Timeline line */}
            <div className="absolute top-1/2 left-4 right-4 h-px bg-black/20" />
            
            {/* Milestone markers */}
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${20 + (milestone.position / 100) * 60}%`, top: '50%' }}
              >
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-white shadow-sm" />
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <div className="text-[10px] font-semibold text-foreground">{milestone.label}</div>
                  <div className="text-[9px] text-muted-foreground">{milestone.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Caption */}
        <p className="text-xs text-muted-foreground text-center mt-6 italic">
          Each memory adds another constellation to your life's archive.
        </p>
      </div>
    </Card>
  );
};

export default StoryMap;
