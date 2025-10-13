import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';

interface StoryMapProps {
  memories: any[];
  profile: any;
}

interface ThemeNode {
  theme: string;
  count: number;
  color: string;
  angle: number;
}

interface Milestone {
  label: string;
  date: string;
  position: number;
}

const StoryMap = ({ memories, profile }: StoryMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [themeNodes, setThemeNodes] = useState<ThemeNode[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [insight, setInsight] = useState<string>('');
  const animationFrameRef = useRef<number>();

  // Extract themes from memories
  useEffect(() => {
    if (!memories || memories.length === 0) return;

    // Count memory themes/tags
    const themeCount: Record<string, number> = {};
    memories.forEach((memory) => {
      const tags = memory.tags || [];
      tags.forEach((tag: string) => {
        themeCount[tag] = (themeCount[tag] || 0) + 1;
      });
    });

    // Get top 5 themes
    const topThemes = Object.entries(themeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([theme, count], index) => ({
        theme,
        count,
        color: ['#93C5FD', '#FCD34D', '#E5E7EB', '#A5B4FC', '#F9A8D4'][index % 5],
        angle: (index * (Math.PI * 2)) / 5,
      }));

    setThemeNodes(topThemes);

    // Generate milestones
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

    // Generate insight
    const recentCount = memories.filter(
      (m) => new Date(m.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    
    if (topThemes.length > 0) {
      setInsight(
        `This month's ${recentCount} memories orbit around ${topThemes[0].theme.toLowerCase()} and connection.`
      );
    } else {
      setInsight('Each memory you add creates a new constellation in your story.');
    }
  }, [memories]);

  // Animate orbital visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || themeNodes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const animate = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);

      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      const orbitRadius = Math.min(width, height) * 0.3;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw orbit circle
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw central "You" node
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('You', centerX, centerY);

      // Draw orbiting theme nodes
      themeNodes.forEach((node, index) => {
        const angle = node.angle + time * 0.0005 + (index * Math.PI * 2) / themeNodes.length;
        const x = centerX + Math.cos(angle) * orbitRadius;
        const y = centerY + Math.sin(angle) * orbitRadius;

        // Draw glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
        gradient.addColorStop(0, node.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();

        // Draw node circle
        ctx.fillStyle = node.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw theme label
        ctx.fillStyle = '#000000';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.theme, x, y - 35);
      });

      time += 16;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [themeNodes]);

  if (memories.length === 0) {
    return (
      <Card className="h-full modern-card border-[1.5px] border-black p-8 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white animate-fade-in">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Your Living Archive</h3>
        <p className="text-muted-foreground text-center max-w-sm">
          Start adding memories to see your story map come to life
        </p>
      </Card>
    );
  }

  return (
    <Card className="h-full modern-card border-[1.5px] border-black p-8 bg-gradient-to-br from-gray-50 to-white animate-fade-in shadow-elegant overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Title */}
        <h3 className="text-2xl font-semibold text-foreground mb-2">Your Living Archive</h3>
        <p className="text-sm text-muted-foreground mb-6 italic">{insight}</p>

        {/* Orbital Visualization */}
        <div className="flex-1 min-h-[300px] mb-6">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ maxHeight: '350px' }}
          />
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
