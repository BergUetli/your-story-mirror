import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Calendar, MapPin, Heart } from 'lucide-react';

interface StoryMapProps {
  memories: any[];
  profile: any;
}

interface Milestone {
  label: string;
  date: string;
  position: number;
}

interface LifeSummary {
  age: number | null;
  yearsRecorded: number;
  totalMemories: number;
  topThemes: string[];
  recentActivity: string;
  journeyPhase: string;
}

const StoryMap = ({ memories, profile }: StoryMapProps) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [lifeSummary, setLifeSummary] = useState<LifeSummary | null>(null);

  // Calculate life summary and extract themes
  useEffect(() => {
    if (!memories || memories.length === 0) {
      setLifeSummary(null);
      return;
    }

    // Calculate age
    let age: number | null = null;
    if (profile?.birth_date) {
      const birthDate = new Date(profile.birth_date);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Count memory themes/tags
    const themeCount: Record<string, number> = {};
    memories.forEach((memory) => {
      const tags = memory.tags || [];
      tags.forEach((tag: string) => {
        themeCount[tag] = (themeCount[tag] || 0) + 1;
      });
    });

    // Get top 3 themes
    const topThemes = Object.entries(themeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([theme]) => theme);

    // Calculate years recorded
    const sortedMemories = [...memories].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const firstMemory = sortedMemories[0];
    const yearsRecorded = firstMemory 
      ? new Date().getFullYear() - new Date(firstMemory.created_at).getFullYear() + 1
      : 1;

    // Recent activity
    const recentCount = memories.filter(
      (m) => new Date(m.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    const recentActivity = recentCount > 0 
      ? `${recentCount} ${recentCount === 1 ? 'memory' : 'memories'} this month`
      : 'No recent memories';

    // Journey phase (poetic description based on age and memory count)
    let journeyPhase = 'Beginning to preserve your story';
    if (memories.length > 50) {
      journeyPhase = 'Building a rich archive of experiences';
    } else if (memories.length > 20) {
      journeyPhase = 'Capturing meaningful moments';
    } else if (memories.length > 5) {
      journeyPhase = 'Growing your collection';
    }

    setLifeSummary({
      age,
      yearsRecorded,
      totalMemories: memories.length,
      topThemes,
      recentActivity,
      journeyPhase,
    });

    // Generate milestones
    const newMilestones: Milestone[] = [];
    
    if (sortedMemories.length > 0) {
      newMilestones.push({
        label: 'First Recording',
        date: new Date(sortedMemories[0].created_at).toLocaleDateString(),
        position: 0,
      });
    }

    if (sortedMemories.length > 2) {
      const midIndex = Math.floor(sortedMemories.length / 2);
      newMilestones.push({
        label: 'Milestone Memory',
        date: new Date(sortedMemories[midIndex].created_at).toLocaleDateString(),
        position: 50,
      });
    }

    if (sortedMemories.length > 0) {
      newMilestones.push({
        label: 'Recent Upload',
        date: new Date(sortedMemories[sortedMemories.length - 1].created_at).toLocaleDateString(),
        position: 100,
      });
    }

    setMilestones(newMilestones);
  }, [memories, profile]);


  if (memories.length === 0 || !lifeSummary) {
    return (
      <Card className="h-full modern-card border-[1.5px] border-black p-8 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white animate-fade-in">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Your Living Archive</h3>
        <p className="text-muted-foreground text-center max-w-sm">
          Start adding memories to see your life summary
        </p>
      </Card>
    );
  }

  return (
    <Card className="h-full modern-card border-[1.5px] border-black p-8 bg-gradient-to-br from-gray-50 to-white animate-fade-in shadow-elegant overflow-auto">
      <div className="flex flex-col h-full space-y-8">
        {/* Title */}
        <div>
          <h3 className="text-2xl font-semibold text-foreground mb-2">Where You Are</h3>
          <p className="text-sm text-muted-foreground italic">{lifeSummary.journeyPhase}</p>
        </div>

        {/* Life Summary Stats */}
        <div className="space-y-4">
          {lifeSummary.age && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Your Journey</p>
                <p className="text-base text-muted-foreground">
                  {lifeSummary.age} years of life
                  {profile?.birth_place && ` • Born in ${profile.birth_place}`}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Memories Preserved</p>
              <p className="text-base text-muted-foreground">
                {lifeSummary.totalMemories} {lifeSummary.totalMemories === 1 ? 'memory' : 'memories'} across {lifeSummary.yearsRecorded} {lifeSummary.yearsRecorded === 1 ? 'year' : 'years'}
              </p>
            </div>
          </div>

          {profile?.current_location && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Current Location</p>
                <p className="text-base text-muted-foreground">{profile.current_location}</p>
              </div>
            </div>
          )}
        </div>

        {/* Top Themes */}
        {lifeSummary.topThemes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Your Story Themes</h4>
            <div className="flex flex-wrap gap-2">
              {lifeSummary.topThemes.map((theme, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full border border-primary/20"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Recent Activity</h4>
          <p className="text-base text-muted-foreground">{lifeSummary.recentActivity}</p>
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
