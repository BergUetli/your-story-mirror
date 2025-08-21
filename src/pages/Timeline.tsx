import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// Life events and memories
const lifeEvents = [
  { year: 1995, event: 'Birth', type: 'milestone' },
  { year: 2013, event: 'High School Graduation', type: 'milestone' },
  { year: 2017, event: 'College Graduation', type: 'milestone' },
  { year: 2019, event: 'First Job', type: 'milestone' },
  { year: 2022, event: 'Marriage', type: 'milestone' },
];

const mockMemories = [
  {
    id: 1,
    date: '2024-01-15',
    year: 2024,
    title: 'Sunday morning with Mom',
    preview: 'The smell of pancakes filled the kitchen as Mom hummed her favorite song...',
  },
  {
    id: 2,
    date: '2024-01-10', 
    year: 2024,
    title: 'First day at the new job',
    preview: 'Walking through those glass doors, I felt a mixture of excitement and nervousness...',
  },
  {
    id: 3,
    date: '2023-06-08',
    year: 2023,
    title: 'Evening walk with Sarah',
    preview: 'The sunset painted the sky in shades of amber as we talked about our dreams...',
  },
  {
    id: 4,
    date: '2022-12-05',
    year: 2022,
    title: 'Wedding Day',
    preview: 'The most beautiful day of our lives, surrounded by everyone we love...',
  },
  {
    id: 5,
    date: '2019-03-15',
    year: 2019,
    title: 'First Day at Work',
    preview: 'Walking into the office, nervous but excited about this new chapter...',
  }
];

// Create timeline data combining events and memories
const createTimelineData = () => {
  const currentYear = new Date().getFullYear();
  const startYear = 1995;
  const timelineData = [];
  
  for (let year = startYear; year <= currentYear; year++) {
    const yearEvents = lifeEvents.filter(event => event.year === year);
    const yearMemories = mockMemories.filter(memory => memory.year === year);
    
    if (yearEvents.length > 0 || yearMemories.length > 0) {
      timelineData.push({
        year,
        events: yearEvents,
        memories: yearMemories,
        hasContent: true
      });
    }
  }
  
  return timelineData;
};

const Timeline = () => {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [animatingMemory, setAnimatingMemory] = useState<number | null>(null);
  const timelineData = createTimelineData();

  // Simulate new memory being added and materialized
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newMemoryId = urlParams.get('newMemory');
    
    if (newMemoryId) {
      setAnimatingMemory(parseInt(newMemoryId));
      setTimeout(() => setAnimatingMemory(null), 2000);
    }
  }, []);

  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  return (
    <div className="min-h-screen bg-white font-exhibit">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm z-10 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-black">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to sanctuary
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Timeline */}
      <div className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative">
            
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 w-1 bg-black" style={{ height: `${timelineData.length * 200}px` }}>
              {/* Timeline notches */}
              {timelineData.map((yearData, index) => (
                <div
                  key={yearData.year}
                  className="absolute w-4 h-4 bg-black rounded-full -left-1.5"
                  style={{ top: `${index * 200 + 40}px` }}
                />
              ))}
            </div>

            {/* Timeline Content */}
            <div className="ml-20 space-y-48">
              {timelineData.map((yearData, index) => (
                <div key={yearData.year} className="relative">
                  
                  {/* Year Header */}
                  <div 
                    className="cursor-pointer group mb-8"
                    onClick={() => toggleYear(yearData.year)}
                  >
                    <h2 className="text-4xl font-bold text-black mb-2 group-hover:text-gray-600 transition-colors">
                      {yearData.year}
                    </h2>
                    
                    {/* Life Events */}
                    {yearData.events.map((event, eventIndex) => (
                      <div key={eventIndex} className="text-lg font-medium text-gray-800 mb-1">
                        {event.event}
                      </div>
                    ))}
                  </div>

                  {/* Expanded Year Content */}
                  {expandedYears.has(yearData.year) && (
                    <div className="space-y-6 animate-fade-in">
                      {yearData.memories.map((memory) => (
                        <div
                          key={memory.id}
                          className={`bg-gray-50 p-6 rounded-none border-l-4 border-black max-w-md ${
                            animatingMemory === memory.id 
                              ? 'animate-scale-in bg-yellow-50' 
                              : ''
                          }`}
                        >
                          <div className="text-sm text-gray-500 mb-2">
                            {new Date(memory.date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <h3 className="text-xl font-semibold text-black mb-3">
                            {memory.title}
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            {memory.preview}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;