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
    const { mode, message, memories } = request;
    
    // More contextual responses based on the user's message and mode
    if (mode === 'visitor') {
      return {
        quote: "These memories paint a picture of someone who truly lived.",
        reflection: "From what has been shared, I see a person who found joy in simple moments and deep connections. The memories speak of someone who valued authenticity and human connection.",
        followUp: "What aspect of these memories resonates most with you?"
      };
    }

    // User mode - more personal responses
    const responses = [
      {
        quote: "Every memory you share becomes part of your lasting legacy.",
        reflection: "I can sense there's depth in what you're sharing. These moments - whether joyful or challenging - are the threads that weave the tapestry of who you are.",
        followUp: "What memory from today would you want to preserve?"
      },
      {
        quote: "Your voice carries the weight of lived experience.",
        reflection: "The fact that you're here, ready to share and reflect, tells me you understand the value of preserving these precious moments. Each story adds another layer to your beautiful complexity.",
        followUp: "Is there a particular time in your life you've been thinking about lately?"
      },
      {
        quote: "In sharing our stories, we find connection across time.",
        reflection: "Your willingness to open up and share shows courage. These conversations are bridges - connecting your past self to your future, and potentially touching the hearts of those who matter to you.",
        followUp: "What would you want your loved ones to know about this moment in your life?"
      }
    ];

    // Simple hash of message to pick consistent response
    const hash = message ? message.length % responses.length : 0;
    return responses[hash];
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