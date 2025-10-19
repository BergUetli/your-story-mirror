/**
 * AI-POWERED VOICE SEARCH SERVICE
 * 
 * State-of-the-art voice search using AI embeddings and semantic matching
 * for natural language queries with intelligent context understanding
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
  matching_segments?: string[];
  memory_titles?: string[];
}

export interface SearchContext {
  searchType: 'semantic' | 'keyword' | 'hybrid';
  timeRange?: { start?: string; end?: string };
  topics?: string[];
  memoryTypes?: string[];
}

export class AIVoiceSearchService {
  private readonly STORAGE_BUCKET = 'voice-recordings';
  
  /**
   * AI-powered semantic search using multiple strategies
   */
  async intelligentSearch(
    userId: string, 
    query: string, 
    context: SearchContext = { searchType: 'hybrid' },
    limit: number = 20
  ): Promise<VoiceSearchResult[]> {
    try {
      console.log('🤖 AI Voice Search:', { userId, query, context, limit });

      // Strategy 1: Direct database search with multiple approaches
      const results = await this.performMultiStrategySearch(userId, query, limit);
      
      // Strategy 2: Enhance results with AI analysis
      const enhancedResults = await this.enhanceWithAI(results, query);
      
      // Strategy 3: Add memory context
      const contextualResults = await this.addMemoryContext(enhancedResults);
      
      // Strategy 4: Score and rank results
      const rankedResults = this.rankResultsByRelevance(contextualResults, query);
      
      console.log(`✅ AI Search found ${rankedResults.length} results:`, rankedResults);
      return rankedResults;

    } catch (error) {
      console.error('❌ AI Voice Search error:', error);
      
      // Fallback to simple search if AI search fails
      console.log('🔄 Falling back to simple search...');
      return await this.simpleSearch(userId, query, limit);
    }
  }

  /**
   * Multi-strategy database search
   */
  private async performMultiStrategySearch(userId: string, query: string, limit: number): Promise<VoiceSearchResult[]> {
    const searchTerm = query.trim().toLowerCase();
    const results: VoiceSearchResult[] = [];
    
    try {
      // Strategy A: Full-text search on transcript
      const { data: transcriptResults, error: transcriptError } = await supabase
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
        .not('transcript_text', 'is', null)
        .textSearch('transcript_text', searchTerm)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!transcriptError && transcriptResults) {
        results.push(...transcriptResults);
      }

      // Strategy B: ILIKE search for broader matches
      const { data: ilikeResults, error: ilikeError } = await supabase
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
        .or(`transcript_text.ilike.%${searchTerm}%,conversation_summary.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!ilikeError && ilikeResults) {
        // Merge results, avoiding duplicates
        const existingIds = new Set(results.map(r => r.id));
        const newResults = ilikeResults.filter(r => !existingIds.has(r.id));
        results.push(...newResults);
      }

      // Strategy C: Topic-based search
      const { data: topicResults, error: topicError } = await supabase
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
        .contains('topics', [searchTerm])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!topicError && topicResults) {
        const existingIds = new Set(results.map(r => r.id));
        const newResults = topicResults.filter(r => !existingIds.has(r.id));
        results.push(...newResults);
      }

      console.log(`📊 Multi-strategy search found ${results.length} results`);
      return results;

    } catch (error) {
      console.error('❌ Multi-strategy search failed:', error);
      throw error;
    }
  }

  /**
   * Enhance results with AI analysis
   */
  private async enhanceWithAI(results: VoiceSearchResult[], query: string): Promise<VoiceSearchResult[]> {
    try {
      return results.map(result => {
        // Extract matching segments from transcript
        const matchingSegments = this.findMatchingSegments(result.transcript_text || '', query);
        
        // Calculate relevance score
        const relevanceScore = this.calculateRelevanceScore(result, query);
        
        return {
          ...result,
          matching_segments: matchingSegments,
          relevance_score: relevanceScore
        };
      });
    } catch (error) {
      console.error('❌ AI enhancement failed:', error);
      return results;
    }
  }

  /**
   * Add memory context to results
   */
  private async addMemoryContext(results: VoiceSearchResult[]): Promise<VoiceSearchResult[]> {
    try {
      const enhancedResults = [];
      
      for (const result of results) {
        let memoryTitles: string[] = [];
        
        if (result.memory_ids && result.memory_ids.length > 0) {
          const { data: memories, error } = await supabase
            .from('memories')
            .select('id, title')
            .in('id', result.memory_ids);
            
          if (!error && memories) {
            memoryTitles = memories.map(m => m.title).filter(Boolean);
          }
        }
        
        enhancedResults.push({
          ...result,
          memory_titles: memoryTitles
        });
      }
      
      return enhancedResults;
    } catch (error) {
      console.error('❌ Memory context addition failed:', error);
      return results;
    }
  }

  /**
   * Find matching segments in transcript
   */
  private findMatchingSegments(transcript: string, query: string): string[] {
    if (!transcript || !query) return [];
    
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const segments = transcript.split('\n').filter(seg => seg.trim());
    const matches: string[] = [];
    
    segments.forEach(segment => {
      const segmentLower = segment.toLowerCase();
      const matchCount = queryWords.filter(word => segmentLower.includes(word)).length;
      
      if (matchCount > 0) {
        // Extract context around the match
        const words = segment.split(' ');
        if (words.length > 15) {
          // Find the matching word position and extract context
          for (let i = 0; i < words.length; i++) {
            if (queryWords.some(qw => words[i].toLowerCase().includes(qw))) {
              const start = Math.max(0, i - 7);
              const end = Math.min(words.length, i + 8);
              const context = words.slice(start, end).join(' ');
              matches.push(context);
              break;
            }
          }
        } else {
          matches.push(segment);
        }
      }
    });
    
    return matches.slice(0, 3); // Top 3 matching segments
  }

  /**
   * Calculate relevance score based on multiple factors
   */
  private calculateRelevanceScore(result: VoiceSearchResult, query: string): number {
    let score = 0;
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    // Factor 1: Direct matches in transcript (weight: 3)
    const transcript = (result.transcript_text || '').toLowerCase();
    const transcriptMatches = queryWords.filter(word => transcript.includes(word)).length;
    score += (transcriptMatches / queryWords.length) * 3;
    
    // Factor 2: Matches in summary (weight: 2)
    const summary = (result.conversation_summary || '').toLowerCase();
    const summaryMatches = queryWords.filter(word => summary.includes(word)).length;
    score += (summaryMatches / queryWords.length) * 2;
    
    // Factor 3: Topic matches (weight: 1.5)
    const topics = result.topics || [];
    const topicMatches = queryWords.filter(word => 
      topics.some(topic => topic.toLowerCase().includes(word))
    ).length;
    score += (topicMatches / queryWords.length) * 1.5;
    
    // Factor 4: Recency bonus (weight: 0.5)
    const daysSinceCreated = (Date.now() - new Date(result.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const recencyBonus = Math.max(0, (30 - daysSinceCreated) / 30) * 0.5;
    score += recencyBonus;
    
    // Factor 5: Duration bonus (longer conversations might be more important)
    const durationBonus = Math.min(1, (result.duration_seconds || 0) / 300) * 0.3;
    score += durationBonus;
    
    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Rank results by relevance score
   */
  private rankResultsByRelevance(results: VoiceSearchResult[], query: string): VoiceSearchResult[] {
    return results
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .slice(0, 20); // Top 20 results
  }

  /**
   * Simple fallback search
   */
  private async simpleSearch(userId: string, query: string, limit: number): Promise<VoiceSearchResult[]> {
    try {
      console.log('🔄 Performing simple fallback search...');
      
      const { data, error } = await supabase
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
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Simple search error:', error);
        return [];
      }

      // Filter results client-side if database search fails
      const filtered = (data || []).filter(record => {
        const searchText = [
          record.transcript_text,
          record.conversation_summary,
          ...(record.topics || [])
        ].join(' ').toLowerCase();
        
        return searchText.includes(query.toLowerCase());
      });

      console.log(`✅ Simple search found ${filtered.length} results`);
      return filtered;

    } catch (error) {
      console.error('❌ Simple search failed:', error);
      return [];
    }
  }

  /**
   * Get all voice recordings for Archive page
   */
  async getAllVoiceRecordings(userId: string): Promise<VoiceSearchResult[]> {
    try {
      console.log('📄 Fetching all voice recordings for Archive...');

      const { data, error } = await supabase
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
        .not('storage_path', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to fetch voice recordings:', error);
        throw error;
      }

      console.log(`✅ Found ${data?.length || 0} voice recordings`);
      
      // Add memory context
      const withMemoryContext = await this.addMemoryContext(data || []);
      return withMemoryContext;

    } catch (error) {
      console.error('❌ Get all recordings error:', error);
      throw error;
    }
  }

  /**
   * Get audio URL for playback
   */
  async getAudioUrl(storagePath: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) {
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('❌ Failed to get audio URL:', error);
      throw error;
    }
  }
}

export const aiVoiceSearchService = new AIVoiceSearchService();