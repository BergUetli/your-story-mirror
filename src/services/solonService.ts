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

  async chat(request: SolonRequest): Promise<SolonResponse> {
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
      
      // Fallback response
      return {
        quote: "I'm here to help preserve your memories.",
        reflection: "Every story shared becomes part of a lasting legacy.",
        followUp: "What memory would you like to explore today?"
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