import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemories } from '@/hooks/useMemories';

// User profile data (in a real app, this would come from user settings)
const userProfile = {
  birthDate: '1995-03-15',
  birthPlace: 'San Francisco, CA',
  name: 'Your Journey'
};

// Life events and memories
const lifeEvents = [
  { 
    year: 1995, 
    event: 'Born', 
    type: 'milestone',
    location: userProfile.birthPlace,
    date: userProfile.birthDate
  },
  { year: 2013, event: 'High School Graduation', type: 'milestone' },
  { year: 2017, event: 'College Graduation', type: 'milestone' },
  { year: 2019, event: 'First Job', type: 'milestone' },
  { year: 2022, event: 'Marriage', type: 'milestone' },
];

// Create timeline data combining events and memories
const createTimelineData = (actualMemories: any[]) => {
  const currentYear = new Date().getFullYear();
  const birthYear = new Date(userProfile.birthDate).getFullYear();
  const timelineData = [];
  
  for (let year = birthYear; year <= currentYear; year++) {
    const yearEvents = lifeEvents.filter(event => event.year === year);
    const yearMemories = actualMemories.filter(memory => {
      const memoryYear = new Date(memory.created_at || memory.date).getFullYear();
      return memoryYear === year;
    });
    
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
  const [animatingMemory, setAnimatingMemory] = useState<string | null>(null);
  const [materializingMemory, setMaterializingMemory] = useState<string | null>(null);
  const { memories } = useMemories();
  const timelineData = createTimelineData(memories);

  // Handle new memory materialization animation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newMemoryId = urlParams.get('newMemory');
    const shouldAnimate = urlParams.get('animate') === 'true';
    
    if (newMemoryId && shouldAnimate) {
      // First expand the year containing the new memory
      const memory = memories.find(m => m.id === newMemoryId);
      if (memory) {
        const memoryYear = new Date(memory.created_at || memory.date).getFullYear();
        setExpandedYears(prev => new Set([...prev, memoryYear]));
        
        // Then start the materialization animation
        setTimeout(() => {
          setMaterializingMemory(newMemoryId);
          
          // Stop animation after completion
          setTimeout(() => {
            setMaterializingMemory(null);
            // Clean up URL
            window.history.replaceState({}, '', '/timeline');
          }, 2000);
        }, 300);
      }
    }
  }, [memories]);

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
                      <div key={eventIndex} className="space-y-1">
                        <div className="text-lg font-medium text-gray-800 flex items-center gap-2">
                          {event.event}
                          {event.type === 'milestone' && yearData.year === new Date(userProfile.birthDate).getFullYear() && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </div>
                          )}
                        </div>
                        {event.date && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(event.date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Expanded Year Content */}
                  {expandedYears.has(yearData.year) && (
                    <div className="space-y-6 animate-fade-in">
                      {yearData.memories.map((memory) => (
                        <div
                          key={memory.id}
                          className={`bg-gray-50 p-6 rounded-none border-l-4 border-black transition-all duration-500 ${
                            materializingMemory === memory.id 
                              ? 'animate-materialize bg-memory/10 border-memory shadow-lg' 
                              : 'max-w-md'
                          } ${
                            memory.recipient === 'family' ? 'max-w-lg' :
                            memory.recipient === 'public' ? 'max-w-xl' : 'max-w-md'
                          }`}
                        >
                          <div className="text-sm text-gray-500 mb-2">
                            {new Date(memory.created_at || memory.date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <h3 className="text-xl font-semibold text-black mb-3">
                            {memory.title}
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            {memory.content || memory.preview}
                          </p>
                          {memory.conversation_text && (
                            <details className="mt-4">
                              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                                View conversation with Solon
                              </summary>
                              <div className="mt-2 p-3 bg-gray-100 rounded text-sm text-gray-700 whitespace-pre-line">
                                {memory.conversation_text}
                              </div>
                            </details>
                          )}
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