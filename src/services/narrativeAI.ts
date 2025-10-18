/**
 * PROPRIETARY NARRATIVE AI SERVICE
 * 
 * Generates unique, personalized biographical narratives using AI models.
 * Creates persistent stories that maintain consistency while allowing for 
 * intelligent updates when new memories are added or user requests changes.
 */

import { GroupedMemory } from '@/utils/memoryGrouping';
import { supabase } from '@/integrations/supabase/client';
// Simple hash function for browser compatibility (replaces Node.js crypto)
const simpleHash = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

// Configuration for narrative generation
const NARRATIVE_CONFIG = {
  model: 'gpt-4',
  temperature: 0.7, // Balanced creativity while maintaining consistency
  max_tokens: 4000,
  style: 'reflective_optimistic',
  company_voice: 'compassionate_storytelling'
};

export interface BiographyChapter {
  id: string;
  chapter_title: string;
  chapter_content: string;
  chapter_sequence: number;
  life_period: string;
  age_range_start?: number;
  age_range_end?: number;
  memory_group_ids: string[];
}

export interface PersistentBiography {
  id: string;
  user_id: string;
  introduction: string;
  conclusion: string;
  chapters: BiographyChapter[];
  style_version: string;
  memories_included: string[];
  last_regenerated_at: string;
  regeneration_reason?: string;
}

export interface NarrativeGenerationContext {
  user_profile: {
    name?: string;
    birth_date?: string;
    birth_place?: string;
    current_location?: string;
    age?: number;
  };
  memories: GroupedMemory[];
  biography_topics: {
    topic_category: string;
    topic_title: string;
    content: string;
  }[];
  generation_preferences: {
    tone: 'reflective' | 'optimistic' | 'reflective_optimistic';
    length: 'brief' | 'moderate' | 'comprehensive';
    focus_themes?: string[];
  };
}

class NarrativeAIService {
  private isEnabled: boolean;
  private apiEndpoint: string;
  private apiKey: string;

  constructor() {
    // Check if OpenAI integration is available via Supabase Edge Function
    this.apiEndpoint = '/functions/v1/narrative-generator'; // Supabase edge function
    this.apiKey = ''; // Will use Supabase auth
    this.isEnabled = true; // Always enabled through edge function
    
    console.log('📚 Narrative AI Service initialized');
  }

  /**
   * Generate a complete persistent biography for a user
   */
  async generatePersistentBiography(
    userId: string, 
    context: NarrativeGenerationContext,
    regenerationReason: string = 'initial_creation'
  ): Promise<PersistentBiography> {
    try {
      console.log('🤖 Generating AI narrative for user:', userId, { reason: regenerationReason });

      // Create generation prompt hash for consistency tracking
      const promptHash = this.createPromptHash(context);

      // Generate the narrative using our proprietary AI service
      const narrative = await this.callNarrativeAI(context, 'full_biography');

      // Store in database
      const persistentBiography = await this.storePersistentBiography(
        userId,
        narrative,
        context.memories.map(m => m.memory_group_id || m.id),
        promptHash,
        regenerationReason
      );

      console.log('✅ AI narrative generated and stored:', persistentBiography.id);
      return persistentBiography;

    } catch (error) {
      console.error('❌ Failed to generate persistent biography:', error);
      throw error;
    }
  }

  /**
   * Get existing persistent biography or generate new one
   */
  async getPersistentBiography(userId: string): Promise<PersistentBiography | null> {
    try {
      // Check if persistent biography already exists
      const { data: existing, error } = await supabase
        .from('persistent_biography')
        .select(`
          *,
          biography_chapters (*)
        `)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (existing) {
        return {
          ...existing,
          chapters: existing.biography_chapters || []
        } as PersistentBiography;
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to fetch persistent biography:', error);
      return null;
    }
  }

  /**
   * Update narrative when new memory is added
   */
  async insertMemoryIntoNarrative(
    userId: string,
    newMemory: GroupedMemory,
    context: NarrativeGenerationContext
  ): Promise<{ updatedChapter?: BiographyChapter; newChapter?: BiographyChapter }> {
    try {
      console.log('🧩 Inserting new memory into existing narrative:', newMemory.title);

      const existingBiography = await this.getPersistentBiography(userId);
      if (!existingBiography) {
        throw new Error('No existing biography found. Generate full biography first.');
      }

      // Determine which chapter this memory should belong to
      const targetChapter = await this.determineTargetChapter(newMemory, existingBiography.chapters, context);
      
      if (targetChapter.action === 'update_existing') {
        // Update existing chapter to include new memory
        const updatedChapter = await this.updateChapterWithMemory(
          targetChapter.chapter!,
          newMemory,
          context
        );
        
        await this.storeUpdatedChapter(updatedChapter);
        await this.updateBiographyMetadata(userId, [newMemory.memory_group_id || newMemory.id], 'memory_added');
        
        return { updatedChapter };
        
      } else if (targetChapter.action === 'create_new') {
        // Create new chapter for this memory
        const newChapter = await this.createNewChapterForMemory(
          newMemory,
          context,
          existingBiography.chapters.length + 1
        );
        
        await this.storeNewChapter(userId, existingBiography.id, newChapter);
        await this.updateBiographyMetadata(userId, [newMemory.memory_group_id || newMemory.id], 'memory_added');
        
        return { newChapter };
      }

      throw new Error('Unable to determine insertion strategy for memory');

    } catch (error) {
      console.error('❌ Failed to insert memory into narrative:', error);
      throw error;
    }
  }

  /**
   * Regenerate biography based on user prompt
   */
  async regenerateBiographyWithPrompt(
    userId: string,
    userPrompt: string,
    context: NarrativeGenerationContext
  ): Promise<PersistentBiography> {
    console.log('🔄 Regenerating biography with user prompt:', userPrompt);
    
    // Add user prompt to context
    const enhancedContext = {
      ...context,
      user_modification_request: userPrompt
    };

    return this.generatePersistentBiography(userId, enhancedContext, 'user_requested');
  }

  /**
   * Call the narrative AI service (Supabase Edge Function)
   */
  private async callNarrativeAI(context: NarrativeGenerationContext, type: 'full_biography' | 'chapter_update' | 'memory_insertion'): Promise<any> {
    const prompt = this.buildNarrativePrompt(context, type);
    
    try {
      // Call Supabase Edge Function for AI generation
      const { data, error } = await supabase.functions.invoke('narrative-generator', {
        body: {
          prompt,
          context,
          type,
          config: NARRATIVE_CONFIG
        }
      });

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('❌ Narrative AI service call failed:', error);
      // Fallback to local generation if edge function fails
      return this.fallbackNarrativeGeneration(context, type);
    }
  }

  /**
   * Build proprietary narrative prompt
   */
  private buildNarrativePrompt(context: NarrativeGenerationContext, type: string): string {
    const { user_profile, memories, biography_topics, generation_preferences } = context;
    
    const basePrompt = `You are a master biographical storyteller with a proprietary style that creates deeply personal, flowing narratives. Your task is to craft a unique life story that captures the essence of this individual.

PROPRIETARY STYLE GUIDELINES:
- Write in third person using the person's name when available
- Create flowing, literary prose that connects memories thematically rather than chronologically
- Focus on growth, resilience, and the deeper meaning behind experiences  
- Use evocative, warm language that honors both struggles and triumphs
- Build narrative bridges between different life periods
- Emphasize the unique qualities that make this person's story distinctive

USER PROFILE:
Name: ${user_profile.name || 'This individual'}
Born: ${user_profile.birth_date || 'Unknown'} in ${user_profile.birth_place || 'Unknown'}
Current Location: ${user_profile.current_location || 'Unknown'}
Age: ${user_profile.age || 'Unknown'}

BIOGRAPHICAL TOPICS (Personality & Values):
${biography_topics.map(topic => `${topic.topic_category}: ${topic.topic_title} - ${topic.content}`).join('\n')}

MEMORIES TO WEAVE INTO NARRATIVE (${memories.length} memories):
${memories.map((mem, i) => `${i + 1}. "${mem.title}" (${mem.memory_date || 'Undated'}) ${mem.memory_location ? `in ${mem.memory_location}` : ''}\n   ${mem.text?.substring(0, 200)}...`).join('\n')}

GENERATION PREFERENCES:
- Tone: ${generation_preferences.tone}
- Length: ${generation_preferences.length}
- Focus Themes: ${generation_preferences.focus_themes?.join(', ') || 'general life story'}`;

    if (type === 'full_biography') {
      return `${basePrompt}

TASK: Generate a complete biographical narrative with:
1. An engaging introduction that sets the tone for their life story
2. Chapter-based narrative organized by life periods (early years, discovery, building, etc.)
3. A forward-looking conclusion that honors their ongoing journey

Return JSON format:
{
  "introduction": "...",
  "chapters": [
    {
      "title": "...",
      "content": "...", 
      "life_period": "early_years|adolescence|young_adult|building_years|flourishing|wisdom_years",
      "memory_group_ids": ["id1", "id2"]
    }
  ],
  "conclusion": "..."
}`;
    }

    return basePrompt;
  }

  /**
   * Fallback narrative generation when AI service unavailable
   */
  private fallbackNarrativeGeneration(context: NarrativeGenerationContext, type: string): any {
    console.log('📝 Using fallback narrative generation');
    
    const { user_profile, memories } = context;
    const name = user_profile.name || 'This individual';
    
    // Simple but unique fallback based on user's actual data
    return {
      introduction: `${name}'s story is one of ${memories.length > 5 ? 'rich experiences' : 'meaningful moments'} that have shaped a unique journey through life. From ${user_profile.birth_place || 'their beginnings'} to ${user_profile.current_location || 'where they are today'}, each memory preserved here represents a thread in the larger tapestry of their identity.`,
      chapters: [
        {
          title: "A Life in Motion", 
          content: `The memories that ${name} has chosen to preserve reveal a pattern of growth, curiosity, and human connection. ${memories.length > 0 ? `From "${memories[0].title}" to the most recent memories,` : ''} each experience has contributed to the person they have become.`,
          life_period: "comprehensive",
          memory_group_ids: memories.map(m => m.memory_group_id || m.id)
        }
      ],
      conclusion: `The story of ${name} continues to unfold, with each new day offering opportunities to add fresh chapters to this remarkable narrative. The ${memories.length} memories preserved here are not just records of the past, but foundations for the future yet to be written.`
    };
  }

  /**
   * Store persistent biography in database
   */
  private async storePersistentBiography(
    userId: string,
    narrative: any,
    memoryGroupIds: string[],
    promptHash: string,
    regenerationReason: string
  ): Promise<PersistentBiography> {
    // First, upsert the main biography record
    const { data: biographyData, error: biographyError } = await supabase
      .from('persistent_biography')
      .upsert({
        user_id: userId,
        introduction: narrative.introduction,
        conclusion: narrative.conclusion,
        memories_included: memoryGroupIds,
        generation_prompt_hash: promptHash,
        regeneration_reason: regenerationReason,
        last_regenerated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (biographyError) throw biographyError;

    // Delete existing chapters and create new ones
    await supabase
      .from('biography_chapters')
      .delete()
      .eq('persistent_biography_id', biographyData.id);

    // Insert new chapters
    const chaptersToInsert = narrative.chapters.map((chapter: any, index: number) => ({
      user_id: userId,
      persistent_biography_id: biographyData.id,
      chapter_title: chapter.title,
      chapter_content: chapter.content,
      chapter_sequence: index + 1,
      life_period: chapter.life_period,
      memory_group_ids: chapter.memory_group_ids || []
    }));

    const { data: chaptersData, error: chaptersError } = await supabase
      .from('biography_chapters')
      .insert(chaptersToInsert)
      .select();

    if (chaptersError) throw chaptersError;

    return {
      ...biographyData,
      chapters: chaptersData
    } as PersistentBiography;
  }

  /**
   * Create hash of generation prompt for consistency tracking
   */
  private createPromptHash(context: NarrativeGenerationContext): string {
    const hashContent = JSON.stringify({
      memories_count: context.memories.length,
      memory_titles: context.memories.map(m => m.title).sort(),
      biography_topics: context.biography_topics,
      preferences: context.generation_preferences,
      profile_key_data: {
        birth_date: context.user_profile.birth_date,
        birth_place: context.user_profile.birth_place,
        name: context.user_profile.name
      }
    });
    
    return simpleHash(hashContent);
  }

  /**
   * Determine target chapter for new memory insertion
   */
  private async determineTargetChapter(
    memory: GroupedMemory, 
    existingChapters: BiographyChapter[],
    context: NarrativeGenerationContext
  ): Promise<{ action: 'update_existing' | 'create_new'; chapter?: BiographyChapter }> {
    // Simple logic for now - could be enhanced with AI
    const memoryDate = new Date(memory.memory_date || memory.created_at);
    const memoryYear = memoryDate.getFullYear();
    const birthYear = context.user_profile.birth_date ? new Date(context.user_profile.birth_date).getFullYear() : 1990;
    const age = memoryYear - birthYear;

    // Find chapter that matches this age range
    for (const chapter of existingChapters) {
      if (chapter.age_range_start && chapter.age_range_end) {
        if (age >= chapter.age_range_start && age <= chapter.age_range_end) {
          return { action: 'update_existing', chapter };
        }
      }
    }

    // If no matching chapter found, suggest creating new one
    return { action: 'create_new' };
  }

  /**
   * Update existing chapter with new memory
   */
  private async updateChapterWithMemory(
    chapter: BiographyChapter,
    memory: GroupedMemory,
    context: NarrativeGenerationContext
  ): Promise<BiographyChapter> {
    // Use AI to integrate the memory into existing chapter content
    const enhancedContext = {
      ...context,
      existing_chapter: chapter,
      new_memory: memory
    };

    const updatedContent = await this.callNarrativeAI(enhancedContext, 'memory_insertion');
    
    return {
      ...chapter,
      chapter_content: updatedContent.content,
      memory_group_ids: [...chapter.memory_group_ids, memory.memory_group_id || memory.id]
    };
  }

  /**
   * Create new chapter for memory
   */
  private async createNewChapterForMemory(
    memory: GroupedMemory,
    context: NarrativeGenerationContext,
    sequence: number
  ): Promise<BiographyChapter> {
    const memoryDate = new Date(memory.memory_date || memory.created_at);
    const memoryYear = memoryDate.getFullYear();
    
    return {
      id: '', // Will be set when stored
      chapter_title: `New Chapter: ${memoryYear}`,
      chapter_content: `A new chapter begins with ${memory.title}...`, // Would use AI to generate
      chapter_sequence: sequence,
      life_period: 'recent_addition',
      memory_group_ids: [memory.memory_group_id || memory.id]
    };
  }

  /**
   * Store updated chapter
   */
  private async storeUpdatedChapter(chapter: BiographyChapter): Promise<void> {
    const { error } = await supabase
      .from('biography_chapters')
      .update({
        chapter_content: chapter.chapter_content,
        memory_group_ids: chapter.memory_group_ids
      })
      .eq('id', chapter.id);

    if (error) throw error;
  }

  /**
   * Store new chapter
   */
  private async storeNewChapter(userId: string, biographyId: string, chapter: BiographyChapter): Promise<void> {
    const { error } = await supabase
      .from('biography_chapters')
      .insert({
        user_id: userId,
        persistent_biography_id: biographyId,
        ...chapter
      });

    if (error) throw error;
  }

  /**
   * Update biography metadata
   */
  private async updateBiographyMetadata(userId: string, newMemoryIds: string[], reason: string): Promise<void> {
    const { error } = await supabase
      .from('persistent_biography')
      .update({
        memories_included: supabase.raw('array_cat(memories_included, ?)', [newMemoryIds]),
        last_regenerated_at: new Date().toISOString(),
        regeneration_reason: reason
      })
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Check if service is available
   */
  isServiceAvailable(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const narrativeAI = new NarrativeAIService();

// Export types
export type { NarrativeGenerationContext };