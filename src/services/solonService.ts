import { createClient } from '@supabase/supabase-js';

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
  private supabase: any = null;
  private isSupabaseAvailable = false;

  constructor() {
    this.initializeSupabase();
  }

  private initializeSupabase() {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        this.supabase = createClient(supabaseUrl, supabaseAnonKey);
        this.isSupabaseAvailable = true;
        console.log('Supabase initialized for Solon service');
      } else {
        console.warn('Supabase environment variables not found. Using fallback responses.');
        this.isSupabaseAvailable = false;
      }
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      this.isSupabaseAvailable = false;
    }
  }

  async chat(request: SolonRequest): Promise<SolonResponse> {
    // Try to use the real Supabase function first
    if (!this.isSupabaseAvailable || !this.supabase) {
      console.warn('Supabase not configured, using fallback responses');
      return this.getFallbackResponse(request);
    }

    try {
      const { data, error } = await this.supabase.functions.invoke('solon-ai', {
        body: request
      });

      if (error) {
        throw error;
      }

      return data as SolonResponse;
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
    
    // Generate more contextual, shorter responses based on user input
    // Memory-related responses
    if (userMessage.includes('memory') || userMessage.includes('remember') || userMessage.includes('past')) {
      return {
        quote: "",
        reflection: "That sounds meaningful. Tell me more about that memory.",
        followUp: ""
      };
    }
    
    // Emotion-related responses  
    if (userMessage.includes('feel') || userMessage.includes('emotion') || userMessage.includes('sad') || userMessage.includes('happy') || userMessage.includes('worried')) {
      return {
        quote: "",
        reflection: "I hear you. Those feelings are important. What's bringing this up for you?",
        followUp: ""
      };
    }
    
    // Family/relationship responses
    if (userMessage.includes('family') || userMessage.includes('mother') || userMessage.includes('father') || userMessage.includes('friend') || userMessage.includes('love')) {
      return {
        quote: "",
        reflection: "That person sounds special to you. What made them so important?",
        followUp: ""
      };
    }
    
    // Work/career responses
    if (userMessage.includes('work') || userMessage.includes('job') || userMessage.includes('career') || userMessage.includes('accomplish')) {
      return {
        quote: "",
        reflection: "I'd like to hear more about that. What was that experience like for you?",
        followUp: ""
      };
    }
    
    // Growth/learning responses
    if (userMessage.includes('learn') || userMessage.includes('grow') || userMessage.includes('change') || userMessage.includes('better')) {
      return {
        quote: "",
        reflection: "That sounds like an important realization. Can you tell me more about that?",
        followUp: ""
      };
    }
    
    // Visitor mode responses
    if (mode === 'visitor') {
      return {
        quote: "",
        reflection: "I can share memories from this person's life. What would you like to know?",
        followUp: ""
      };
    }
    
    // Contextual responses based on conversation length - much shorter, more listening-focused
    if (conversationLength === 0) {
      return {
        quote: "",
        reflection: "I'm here to listen. What's on your mind?",
        followUp: ""
      };
    } else if (conversationLength < 4) {
      return {
        quote: "",
        reflection: "I'm listening. Tell me more about that.",
        followUp: ""
      };
    } else {
      return {
        quote: "",
        reflection: "That's interesting. What else comes to mind about that?",
        followUp: ""
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
