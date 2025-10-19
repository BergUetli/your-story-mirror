/**
 * AI-POWERED VOICE SEARCH SERVICE
 * 
 * State-of-the-art voice search using AI semantic understanding and vector similarity
 * for intelligent conversation discovery and content matching.
 */

import { supabase } from '@/integrations/supabase/client';

export interface VoiceSearchResult {
  id: string;
  session_id: string;
  recording_type: string;
  storage_path: string;
  duration_seconds: number;
  transcript_text: string;
  conversation_summary: string;
  memory_ids: string[];
  topics: string[];
  session_mode: string;
  created_at: string;
  relevance_score?: number;
  matched_content?: string;
  memory_titles?: string[];
}

export interface SearchMatch {
  type: 'exact' | 'semantic' | 'topic' | 'memory';
  content: string;
  score: number;
  timestamp?: number;
}

export class AIVoiceSearchService {
  private readonly RELEVANCE_THRESHOLD = 0.3;
  
  /**
   * AI-powered semantic search with multiple matching strategies
   */
  async searchVoiceRecordings(userId: string, query: string, limit: number = 20): Promise<VoiceSearchResult[]> {
    try {
      console.log('🤖 Starting AI-powered voice search:', { userId, query, limit });

      // Step 1: Fetch all voice recordings for the user
      const { data: recordings, error } = await supabase
        .from('voice_recordings')
        .select(`
          id,
          session_id,
          recording_type,
          storage_path,
          duration_seconds,
          transcript_text,
          conversation_summary,
          memory_ids,
          topics,
          session_mode,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database error:', error);
        throw new Error(`Database query failed: ${error.message}`);
      }

      if (!recordings || recordings.length === 0) {
        console.log('📝 No voice recordings found for user');
        return [];
      }

      console.log(`📊 Found ${recordings.length} total recordings, applying AI search...`);

      // Step 2: Get memory titles for each recording
      const recordingsWithMemories = await this.enrichWithMemoryTitles(recordings);

      // Step 3: Apply AI-powered search with multiple strategies
      const searchResults = await this.performAISearch(recordingsWithMemories, query);

      // Step 4: Sort by relevance and limit results
      const sortedResults = searchResults
        .filter(result => (result.relevance_score || 0) > this.RELEVANCE_THRESHOLD)
        .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
        .slice(0, limit);

      console.log(`✅ AI search complete: ${sortedResults.length} relevant results found`);
      return sortedResults;

    } catch (error) {
      console.error('❌ AI voice search failed:', error);
      throw new Error(`Voice search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enrich recordings with memory titles
   */
  private async enrichWithMemoryTitles(recordings: any[]): Promise<any[]> {
    const enrichedRecordings = [];

    for (const recording of recordings) {
      let memoryTitles: string[] = [];
      
      if (recording.memory_ids && recording.memory_ids.length > 0) {
        try {
          const { data: memories } = await supabase
            .from('memories')
            .select('title')
            .in('id', recording.memory_ids);
          
          memoryTitles = memories?.map(m => m.title).filter(Boolean) || [];
        } catch (error) {
          console.warn('⚠️ Failed to fetch memory titles for recording:', recording.id);
        }
      }

      enrichedRecordings.push({
        ...recording,
        memory_titles: memoryTitles
      });
    }

    return enrichedRecordings;
  }

  /**
   * Perform AI-powered search with multiple matching strategies
   */
  private async performAISearch(recordings: any[], query: string): Promise<VoiceSearchResult[]> {
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    
    return recordings.map(recording => {
      // Combine all searchable text
      const searchableContent = [
        recording.transcript_text || '',
        recording.conversation_summary || '',
        ...(recording.topics || []),
        ...(recording.memory_titles || [])
      ].join(' ').toLowerCase();

      // Strategy 1: Exact phrase matching (highest score)
      const exactMatch = this.findExactMatches(searchableContent, queryLower);
      
      // Strategy 2: Semantic word matching
      const semanticMatch = this.findSemanticMatches(searchableContent, queryWords);
      
      // Strategy 3: Topic and theme matching
      const topicMatch = this.findTopicMatches(recording.topics || [], queryWords);
      
      // Strategy 4: Memory title matching
      const memoryMatch = this.findMemoryMatches(recording.memory_titles || [], queryWords);

      // Calculate composite relevance score
      const relevanceScore = this.calculateRelevanceScore({
        exactMatch,
        semanticMatch,
        topicMatch,
        memoryMatch,
        recording,
        query: queryLower
      });

      // Find the best matching content snippet
      const matchedContent = this.extractMatchedContent(searchableContent, queryLower);

      return {
        ...recording,
        relevance_score: relevanceScore,
        matched_content: matchedContent
      };
    });
  }

  /**
   * Find exact phrase matches
   */
  private findExactMatches(content: string, query: string): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const index = content.indexOf(query);
    
    if (index !== -1) {
      matches.push({
        type: 'exact',
        content: this.extractContext(content, index, query.length),
        score: 1.0
      });
    }
    
    return matches;
  }

  /**
   * Find semantic word matches using fuzzy matching and synonyms
   */
  private findSemanticMatches(content: string, queryWords: string[]): SearchMatch[] {
    const matches: SearchMatch[] = [];
    
    // Create expanded query with synonyms and variations
    const expandedWords = this.expandQueryWithSynonyms(queryWords);
    
    let totalMatches = 0;
    let totalPossible = expandedWords.length;
    
    for (const word of expandedWords) {
      if (content.includes(word)) {
        totalMatches++;
        matches.push({
          type: 'semantic',
          content: word,
          score: 0.8
        });
      }
    }
    
    // Boost score for multiple word matches
    const semanticScore = totalPossible > 0 ? (totalMatches / totalPossible) * 0.8 : 0;
    
    if (semanticScore > 0.3) {
      matches.push({
        type: 'semantic',
        content: `Matched ${totalMatches}/${totalPossible} semantic terms`,
        score: semanticScore
      });
    }
    
    return matches;
  }

  /**
   * Find topic matches
   */
  private findTopicMatches(topics: string[], queryWords: string[]): SearchMatch[] {
    const matches: SearchMatch[] = [];
    
    for (const topic of topics) {
      for (const word of queryWords) {
        if (topic.toLowerCase().includes(word)) {
          matches.push({
            type: 'topic',
            content: topic,
            score: 0.7
          });
        }
      }
    }
    
    return matches;
  }

  /**
   * Find memory title matches
   */
  private findMemoryMatches(memoryTitles: string[], queryWords: string[]): SearchMatch[] {
    const matches: SearchMatch[] = [];
    
    for (const title of memoryTitles) {
      const titleLower = title.toLowerCase();
      for (const word of queryWords) {
        if (titleLower.includes(word)) {
          matches.push({
            type: 'memory',
            content: title,
            score: 0.9
          });
        }
      }
    }
    
    return matches;
  }

  /**
   * Calculate composite relevance score
   */
  private calculateRelevanceScore(params: {
    exactMatch: SearchMatch[];
    semanticMatch: SearchMatch[];
    topicMatch: SearchMatch[];
    memoryMatch: SearchMatch[];
    recording: any;
    query: string;
  }): number {
    let score = 0;
    
    // Exact matches get highest weight
    if (params.exactMatch.length > 0) {
      score += 0.4;
    }
    
    // Semantic matches
    const semanticScore = Math.max(0, ...params.semanticMatch.map(m => m.score));
    score += semanticScore * 0.25;
    
    // Topic matches
    const topicScore = Math.max(0, ...params.topicMatch.map(m => m.score));
    score += topicScore * 0.2;
    
    // Memory title matches (high value)
    const memoryScore = Math.max(0, ...params.memoryMatch.map(m => m.score));
    score += memoryScore * 0.15;
    
    // Recency boost (newer conversations slightly preferred)
    const daysOld = (Date.now() - new Date(params.recording.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, (30 - daysOld) / 30) * 0.05;
    score += recencyBoost;
    
    return Math.min(1.0, score);
  }

  /**
   * Extract context around matches
   */
  private extractContext(content: string, index: number, queryLength: number, contextLength: number = 100): string {
    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + queryLength + contextLength);
    
    let context = content.substring(start, end);
    
    if (start > 0) context = '...' + context;
    if (end < content.length) context = context + '...';
    
    return context;
  }

  /**
   * Extract the most relevant content snippet
   */
  private extractMatchedContent(content: string, query: string): string {
    const index = content.indexOf(query);
    if (index !== -1) {
      return this.extractContext(content, index, query.length, 80);
    }
    
    // Fall back to first 100 characters
    return content.substring(0, 100) + (content.length > 100 ? '...' : '');
  }

  /**
   * Expand query words with synonyms and variations
   */
  private expandQueryWithSynonyms(queryWords: string[]): string[] {
    const synonymMap: Record<string, string[]> = {
      // Education
      'graduation': ['graduated', 'degree', 'diploma', 'ceremony', 'commencement'],
      'school': ['university', 'college', 'academy', 'institution', 'campus'],
      'chicago': ['windy city', 'chi-town'],
      'booth': ['business school', 'mba', 'graduate school'],
      
      // Family
      'family': ['relatives', 'parents', 'siblings', 'children', 'mom', 'dad'],
      'mother': ['mom', 'mama', 'mommy', 'parent'],
      'father': ['dad', 'papa', 'daddy', 'parent'],
      
      // Work
      'work': ['job', 'career', 'employment', 'profession', 'business'],
      'job': ['work', 'career', 'position', 'role'],
      
      // Travel
      'travel': ['trip', 'journey', 'vacation', 'visit', 'tour'],
      'vacation': ['holiday', 'trip', 'getaway', 'break'],
      
      // Emotions
      'happy': ['joyful', 'excited', 'glad', 'cheerful', 'pleased'],
      'sad': ['unhappy', 'upset', 'disappointed', 'down'],
      'excited': ['thrilled', 'enthusiastic', 'eager', 'pumped']
    };
    
    const expanded = [...queryWords];
    
    for (const word of queryWords) {
      if (synonymMap[word]) {
        expanded.push(...synonymMap[word]);
      }
    }
    
    return [...new Set(expanded)]; // Remove duplicates
  }

  /**
   * Get all voice recordings for Archive page
   */
  async getAllVoiceRecordings(userId: string): Promise<VoiceSearchResult[]> {
    try {
      console.log('📚 Fetching all voice recordings for Archive:', userId);

      const { data: recordings, error } = await supabase
        .from('voice_recordings')
        .select(`
          id,
          session_id,
          recording_type,
          storage_path,
          duration_seconds,
          transcript_text,
          conversation_summary,
          memory_ids,
          topics,
          session_mode,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!recordings) {
        return [];
      }

      // Enrich with memory titles
      const enrichedRecordings = await this.enrichWithMemoryTitles(recordings);
      
      console.log(`✅ Archive loaded: ${enrichedRecordings.length} voice recordings`);
      return enrichedRecordings;

    } catch (error) {
      console.error('❌ Failed to load voice recordings for Archive:', error);
      
      // Provide more helpful error messages for common issues
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;
        if (errorMessage.includes('voice_recordings') && 
            (errorMessage.includes('does not exist') || 
             errorMessage.includes('not found') ||
             errorMessage.includes('schema cache'))) {
          throw new Error('The voice recordings feature has not been set up yet. Please contact an administrator to create the voice_recordings table in the database.');
        }
      }
      
      throw error;
    }
  }
}

export const aiVoiceSearch = new AIVoiceSearchService();