/**
 * Conversation Insights Service
 * 
 * A completely decoupled service for extracting insights from conversations in real-time.
 * Uses an event emitter pattern to avoid React re-renders that could interfere with
 * the ElevenLabs voice agent.
 * 
 * CRITICAL: This service operates independently from React's render cycle.
 * It uses a singleton pattern and custom events to communicate with UI components.
 */

// Types
export interface ExtractedTag {
  name: string;
  category: 'people' | 'places' | 'emotions' | 'activities' | 'family' | 'memories' | 'work' | 'travel';
  count: number;
}

export interface ConversationMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

// Keywords for real-time extraction
const CATEGORY_KEYWORDS: Record<ExtractedTag['category'], string[]> = {
  family: ['mom', 'dad', 'mother', 'father', 'sister', 'brother', 'grandma', 'grandpa', 'grandmother', 'grandfather', 'aunt', 'uncle', 'cousin', 'family', 'parent', 'child', 'son', 'daughter', 'wife', 'husband', 'spouse'],
  people: ['friend', 'colleague', 'neighbor', 'boss', 'teacher', 'doctor', 'mentor', 'partner'],
  places: ['home', 'house', 'school', 'university', 'college', 'office', 'hospital', 'park', 'beach', 'mountain', 'city', 'country', 'town', 'village', 'restaurant', 'cafe'],
  emotions: ['happy', 'sad', 'angry', 'excited', 'nervous', 'anxious', 'proud', 'grateful', 'love', 'joy', 'fear', 'hope', 'worried', 'peaceful', 'content', 'frustrated', 'surprised'],
  activities: ['birthday', 'wedding', 'graduation', 'holiday', 'vacation', 'celebration', 'party', 'dinner', 'lunch', 'breakfast', 'meeting', 'event', 'ceremony'],
  memories: ['remember', 'childhood', 'growing up', 'years ago', 'back then', 'memory', 'memories', 'experience', 'story', 'moment'],
  work: ['job', 'career', 'work', 'project', 'business', 'company', 'promotion', 'interview', 'meeting', 'presentation'],
  travel: ['trip', 'travel', 'vacation', 'flight', 'journey', 'adventure', 'explore', 'visit', 'tour']
};

// Event types
export const INSIGHTS_EVENTS = {
  TAGS_UPDATED: 'insights:tags-updated',
  STATUS_CHANGED: 'insights:status-changed',
  CONVERSATION_STARTED: 'insights:conversation-started',
  CONVERSATION_ENDED: 'insights:conversation-ended',
} as const;

export type InsightsStatus = 'idle' | 'listening' | 'processing';

/**
 * Singleton service for managing conversation insights extraction
 * Completely decoupled from React - uses DOM events for communication
 */
class ConversationInsightsService {
  private messages: ConversationMessage[] = [];
  private extractedTags: ExtractedTag[] = [];
  private status: InsightsStatus = 'idle';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isActive: boolean = false;
  
  // Debounce settings - longer delays to minimize processing
  private readonly DEBOUNCE_MS = 2000; // 2 seconds debounce
  private readonly MIN_TEXT_LENGTH = 20; // Minimum text to process
  
  constructor() {
    // Bind methods
    this.addMessage = this.addMessage.bind(this);
    this.startConversation = this.startConversation.bind(this);
    this.endConversation = this.endConversation.bind(this);
    this.getTags = this.getTags.bind(this);
    this.getStatus = this.getStatus.bind(this);
  }

  /**
   * Start tracking a new conversation
   */
  startConversation(): void {
    this.messages = [];
    this.extractedTags = [];
    this.isActive = true;
    this.setStatus('listening');
    this.emitEvent(INSIGHTS_EVENTS.CONVERSATION_STARTED, {});
    console.log('[InsightsService] Conversation started');
  }

  /**
   * End the current conversation
   */
  endConversation(): void {
    this.isActive = false;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    // Do one final extraction
    this.processMessages();
    
    this.setStatus('idle');
    this.emitEvent(INSIGHTS_EVENTS.CONVERSATION_ENDED, { tags: this.extractedTags });
    console.log('[InsightsService] Conversation ended, final tags:', this.extractedTags.length);
  }

  /**
   * Add a message to the conversation - NEVER blocks the caller
   * Uses requestIdleCallback for zero impact on main thread
   */
  addMessage(role: 'user' | 'ai', text: string): void {
    if (!this.isActive || !text?.trim()) return;
    
    // Store message immediately (non-blocking)
    this.messages.push({
      role,
      text: text.trim(),
      timestamp: Date.now()
    });

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Schedule processing with debounce - completely async
    this.debounceTimer = setTimeout(() => {
      // Use requestIdleCallback if available for zero main thread impact
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(
          () => this.processMessages(),
          { timeout: 5000 }
        );
      } else {
        // Fallback: use setTimeout to yield to main thread
        setTimeout(() => this.processMessages(), 0);
      }
    }, this.DEBOUNCE_MS);
  }

  /**
   * Process messages and extract tags - runs in idle time
   */
  private processMessages(): void {
    if (this.messages.length === 0) return;
    
    this.setStatus('processing');
    
    try {
      const allText = this.messages.map(m => m.text.toLowerCase()).join(' ');
      
      // Skip if not enough text
      if (allText.length < this.MIN_TEXT_LENGTH) {
        this.setStatus(this.isActive ? 'listening' : 'idle');
        return;
      }
      
      const tagCounts: Record<string, { category: ExtractedTag['category']; count: number }> = {};

      Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
        keywords.forEach(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const matches = allText.match(regex);
          if (matches && matches.length > 0) {
            const tagName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
            if (tagCounts[tagName]) {
              tagCounts[tagName].count += matches.length;
            } else {
              tagCounts[tagName] = {
                category: category as ExtractedTag['category'],
                count: matches.length
              };
            }
          }
        });
      });

      this.extractedTags = Object.entries(tagCounts)
        .map(([name, data]) => ({
          name,
          category: data.category,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Emit updated tags via custom event
      this.emitEvent(INSIGHTS_EVENTS.TAGS_UPDATED, { tags: this.extractedTags });
      
    } catch (error) {
      console.warn('[InsightsService] Tag extraction error:', error);
    } finally {
      this.setStatus(this.isActive ? 'listening' : 'idle');
    }
  }

  /**
   * Get current extracted tags
   */
  getTags(): ExtractedTag[] {
    return [...this.extractedTags];
  }

  /**
   * Get current status
   */
  getStatus(): InsightsStatus {
    return this.status;
  }

  /**
   * Get all messages
   */
  getMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Set status and emit event
   */
  private setStatus(status: InsightsStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emitEvent(INSIGHTS_EVENTS.STATUS_CHANGED, { status });
    }
  }

  /**
   * Emit a custom DOM event - completely decoupled from React
   */
  private emitEvent(eventName: string, detail: any): void {
    // Use window to emit global events
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Subscribe to insights events
   * Returns an unsubscribe function
   */
  static subscribe(
    eventName: string,
    callback: (detail: any) => void
  ): () => void {
    const handler = (event: Event) => {
      callback((event as CustomEvent).detail);
    };
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }
}

// Export singleton instance
export const conversationInsightsService = new ConversationInsightsService();

// Export class for testing
export { ConversationInsightsService };
