interface Memory {
  id?: string;
  title: string;
  content: string;
  date: string;
  recipient?: string;
}

interface SolonResponse {
  quote: string;
  reflection: string;
  followUp: string;
}

interface SolonRequest {
  mode: 'user' | 'visitor';
  message?: string;
  memories: Memory[];
  visitorPermissions?: string[];
  conversationHistory?: Array<{role: 'user' | 'solon', content: string}>;
}

class SolonService {
  private supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  private supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  private isSupabaseAvailable = false;

  constructor() {
    this.isSupabaseAvailable = !!(this.supabaseUrl && this.supabaseAnonKey);
  }

  async chat(request: SolonRequest): Promise<SolonResponse> {
    // If Supabase is not available, return a more contextual fallback response
    if (!this.isSupabaseAvailable) {
      return this.getFallbackResponse(request);
    }

    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/solon-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SolonResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error calling Solon AI:', error);
      return this.getFallbackResponse(request);
    }
  }

  private getFallbackResponse(request: SolonRequest): SolonResponse {
    const { mode, message, memories, conversationHistory = [] } = request;
    
    // Analyze the user's message for more contextual responses
    const userMessage = message?.toLowerCase() || '';
    const conversationLength = conversationHistory.length;
    
    // Memory-related responses
    if (userMessage.includes('memory') || userMessage.includes('remember') || userMessage.includes('past')) {
      return {
        quote: "Our memories are the threads that weave the tapestry of who we are.",
        reflection: "I sense you're thinking deeply about your past experiences. Each memory holds wisdom and meaning, whether joyful or challenging. They shape your unique perspective on life.",
        followUp: "What specific memory has been on your mind lately? I'd love to help you explore its significance."
      };
    }
    
    // Emotion-related responses
    if (userMessage.includes('feel') || userMessage.includes('emotion') || userMessage.includes('sad') || userMessage.includes('happy') || userMessage.includes('worried')) {
      return {
        quote: "Feelings are the colors that paint our experiences with meaning.",
        reflection: "Your emotions are valid and important. They're signals from your inner wisdom, telling you what matters most to you. Thank you for sharing what you're feeling with me.",
        followUp: "How has this feeling been affecting your daily life? Sometimes talking through emotions helps us understand them better."
      };
    }
    
    // Family/relationship responses
    if (userMessage.includes('family') || userMessage.includes('mother') || userMessage.includes('father') || userMessage.includes('friend') || userMessage.includes('love')) {
      return {
        quote: "The love we share with others becomes part of our eternal story.",
        reflection: "Relationships are at the heart of what makes life meaningful. The connections you've built, the love you've shared - these become part of your lasting legacy.",
        followUp: "Tell me about a moment with someone special that still brings you joy. What made that relationship so precious?"
      };
    }
    
    // Work/career responses
    if (userMessage.includes('work') || userMessage.includes('job') || userMessage.includes('career') || userMessage.includes('accomplish')) {
      return {
        quote: "Our work is how we contribute our unique gifts to the world.",
        reflection: "Your professional journey says so much about your values and dedication. Whether celebrated or challenging, these experiences have shaped your character and wisdom.",
        followUp: "What aspect of your work has brought you the most fulfillment? I'd love to hear about a moment you felt truly proud."
      };
    }
    
    // Growth/learning responses
    if (userMessage.includes('learn') || userMessage.includes('grow') || userMessage.includes('change') || userMessage.includes('better')) {
      return {
        quote: "Growth happens not in spite of our struggles, but because of them.",
        reflection: "Your willingness to learn and grow shows such strength. Every challenge you've faced has added to your wisdom and resilience.",
        followUp: "What's the most important lesson life has taught you so far? I'd love to understand how you've grown."
      };
    }
    
    // Visitor mode responses
    if (mode === 'visitor') {
      if (conversationLength > 2) {
        return {
          quote: "Every story shared is a gift that transcends time.",
          reflection: "Through these memories, you're getting to know someone who valued authentic connections and meaningful experiences. Their stories reveal a person who found joy in life's simple moments.",
          followUp: "Which of these memories resonates most deeply with you? What does it tell you about who they were?"
        };
      }
      
      return {
        quote: "These memories are windows into a life fully lived.",
        reflection: "I'm here to share the stories that have been entrusted to me. Each memory reveals something beautiful about the person who lived these experiences.",
        followUp: "What would you like to know about their life? I can share memories about family, adventures, values, or daily moments of joy."
      };
    }
    
    // Contextual responses based on conversation length
    if (conversationLength === 0) {
      return {
        quote: "Every story begins with a single word, every memory with a moment of reflection.",
        reflection: "I'm here to listen and help you explore what's meaningful to you. Whether it's a memory, a feeling, or something you're experiencing right now - I'm honored to be part of your reflection.",
        followUp: "What's been on your heart lately? I'm here to listen and help you make sense of it all."
      };
    } else if (conversationLength < 4) {
      return {
        quote: "In sharing our stories, we discover who we really are.",
        reflection: "I appreciate you opening up and sharing with me. Your willingness to reflect shows wisdom and courage. These moments of connection are precious.",
        followUp: "Tell me more about what you're thinking about. I'm here to help you explore whatever feels important right now."
      };
    } else {
      return {
        quote: "Deep conversations are where transformation happens.",
        reflection: "Our conversation is revealing so much depth and wisdom in your experiences. You're processing important aspects of your life with such thoughtfulness.",
        followUp: "As we continue talking, what feels most important for you to explore or understand better?"
      };
    }
  }

  // Get memories from mock data (replace with actual data source later)
  getMemories(): Memory[] {
    return [
      {
        id: '1',
        title: 'First Day at New Job',
        content: 'I remember walking into that office, nervous but excited. The smell of fresh coffee and the sound of keyboards clicking. It was the beginning of something wonderful.',
        date: '2023-08-15',
        recipient: 'public'
      },
      {
        id: '2', 
        title: 'Mom\'s Secret Recipe',
        content: 'She never wrote it down, just showed me with her hands. "A pinch of this, a dash of that," she\'d say. Now I cook it for my own family, carrying her love forward.',
        date: '2023-09-02',
        recipient: 'family'
      },
      {
        id: '3',
        title: 'Late Night Conversations',
        content: 'Those 3 AM talks when the world was quiet and we shared our deepest thoughts. Sometimes the most profound connections happen in whispered voices.',
        date: '2023-10-18',
        recipient: 'close_friends'
      }
    ];
  }
}

export const solonService = new SolonService();
export type { Memory, SolonResponse };
