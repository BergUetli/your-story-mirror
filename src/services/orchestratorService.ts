// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { userProfileService, type UserProfile } from "./userProfileService";
import { enhancedNarrativeService, type EnhancedNarrativeContext } from "./enhancedNarrativeService";
import { storyEditorService } from "./storyEditorService";
import { memoryService } from "./memoryService";

export interface TaskContext {
  userId: string;
  userProfile?: UserProfile;
  taskType: 'query' | 'narrative_generation' | 'memory_analysis' | 'story_improvement';
  parameters?: any;
}

export interface OrchestratorResponse {
  content: string;
  actions?: TaskAction[];
  suggestions?: string[];
  metadata?: any;
}

export interface TaskAction {
  id: string;
  type: 'create_profile' | 'update_profile' | 'generate_narrative' | 'improve_story' | 'analyze_memories';
  description: string;
  status: 'pending' | 'completed' | 'failed';
  result?: any;
}

export class EnhancedOrchestratorService {
  /**
   * Main orchestration method that handles different types of tasks
   */
  async orchestrate(context: TaskContext): Promise<OrchestratorResponse> {
    try {
      console.log(`🎯 Orchestrating ${context.taskType} task for user ${context.userId}`);

      // Ensure user profile exists
      const userProfile = await this.ensureUserProfile(context.userId);
      context.userProfile = userProfile;

      // Route to appropriate handler
      switch (context.taskType) {
        case 'query':
          return await this.handleQuery(context);
        case 'narrative_generation':
          return await this.handleNarrativeGeneration(context);
        case 'memory_analysis':
          return await this.handleMemoryAnalysis(context);
        case 'story_improvement':
          return await this.handleStoryImprovement(context);
        default:
          return await this.handleQuery(context); // Fallback to query
      }
    } catch (error) {
      console.error('❌ Orchestration error:', error);
      throw error;
    }
  }

  /**
   * Legacy ask method for backward compatibility
   */
  async ask(params: { message: string; limit?: number }): Promise<{ content: string }> {
    // userId is now derived from JWT token on server-side
    const { data, error } = await supabase.functions.invoke("orchestrator", {
      body: { message: params.message, limit: params.limit },
    });
    if (error) throw error;
    return data as { content: string };
  }

  /**
   * Smart narrative generation with user context
   */
  async generateSmartNarrative(userId: string, preferences?: any): Promise<OrchestratorResponse> {
    try {
      console.log('📖 Generating smart narrative with user context...');

      const userProfile = await userProfileService.getOrCreateProfile(userId);
      const memories = await memoryService.getMemories();
      
      // Create narrative context
      const narrativeContext: EnhancedNarrativeContext = {
        userProfile,
        memories: memories.map(m => ({ // Convert to GroupedMemory format
          id: m.id || '',
          title: m.title,
          content: m.content,
          created_at: m.created_at || new Date().toISOString(),
          memory_group_id: m.id || '',
          memories: [m]
        })),
        preferences: {
          tone: preferences?.tone || 'reflective',
          style: preferences?.style || 'adaptive',
          length: preferences?.length || 'detailed',
          ...preferences
        }
      };

      // Generate and improve narrative
      const narrativeResult = await enhancedNarrativeService.generateAndImproveNarrative(narrativeContext);

      const actions: TaskAction[] = [{
        id: 'narrative-generation',
        type: 'generate_narrative',
        description: 'Generated enhanced narrative with user profile integration',
        status: 'completed',
        result: narrativeResult
      }];

      if (narrativeResult.improvementSummary.changesApplied > 0) {
        actions.push({
          id: 'story-improvement',
          type: 'improve_story',
          description: `Applied ${narrativeResult.improvementSummary.changesApplied} improvements`,
          status: 'completed',
          result: narrativeResult.improvementSummary
        });
      }

      const suggestions = [
        'Consider adding more specific details to your memories for richer narratives',
        'Update your profile with recent life events to keep your story current',
        'Explore different narrative tones to find what resonates best with you'
      ];

      return {
        content: `Enhanced narrative generated successfully! Quality score: ${narrativeResult.finalStory.metadata.qualityScore || 'N/A'}/100. ${narrativeResult.improvementSummary.changesApplied > 0 ? `Auto-improved with ${narrativeResult.improvementSummary.changesApplied} changes.` : ''}`,
        actions,
        suggestions,
        metadata: {
          narrative: narrativeResult.finalStory,
          improvement: narrativeResult.improvementSummary,
          qualityAnalysis: narrativeResult.analysis
        }
      };
    } catch (error) {
      console.error('❌ Error generating smart narrative:', error);
      throw error;
    }
  }

  /**
   * Analyze user's memory collection and provide insights
   */
  async analyzeMemoryCollection(userId: string): Promise<OrchestratorResponse> {
    try {
      console.log('🔍 Analyzing memory collection...');

      const userProfile = await userProfileService.getOrCreateProfile(userId);
      const memories = await memoryService.getMemories();
      
      // Analyze memory patterns
      const memoryInsights = this.analyzeMemoryPatterns(memories, userProfile);
      
      // Check profile completeness
      const profileGaps = this.identifyProfileGaps(userProfile);
      
      // Generate personalized suggestions
      const personalizedSuggestions = this.generatePersonalizedSuggestions(memoryInsights, profileGaps);

      const actions: TaskAction[] = [{
        id: 'memory-analysis',
        type: 'analyze_memories',
        description: 'Analyzed memory collection and profile completeness',
        status: 'completed',
        result: { memoryInsights, profileGaps }
      }];

      return {
        content: `Memory analysis complete! Found ${memories.length} memories with ${memoryInsights.themes.length} key themes. Profile is ${userProfile.profile_completeness_score}% complete.`,
        actions,
        suggestions: personalizedSuggestions,
        metadata: {
          memoryCount: memories.length,
          themes: memoryInsights.themes,
          profileCompleteness: userProfile.profile_completeness_score,
          gaps: profileGaps
        }
      };
    } catch (error) {
      console.error('❌ Error analyzing memory collection:', error);
      throw error;
    }
  }

  // Private helper methods

  private async ensureUserProfile(userId: string): Promise<UserProfile> {
    try {
      let profile = await userProfileService.getProfile(userId);
      
      if (!profile) {
        console.log('📝 Creating new user profile...');
        profile = await userProfileService.createProfile(userId);
      }
      
      return profile;
    } catch (error) {
      console.error('❌ Error ensuring user profile:', error);
      throw error;
    }
  }

  private async handleQuery(context: TaskContext): Promise<OrchestratorResponse> {
    // Handle general queries with user context
    const message = context.parameters?.message || '';
    
    // Enhance query with user profile context
    const enhancedMessage = context.userProfile 
      ? `User context: ${userProfileService.getProfileSummary(context.userProfile)}\n\nUser query: ${message}`
      : message;

    const response = await this.ask({ 
      message: enhancedMessage, 
      limit: context.parameters?.limit 
    });

    return {
      content: response.content,
      suggestions: [
        'Ask about generating your life story',
        'Explore your memory patterns and themes',
        'Update your profile for more personalized responses'
      ]
    };
  }

  private async handleNarrativeGeneration(context: TaskContext): Promise<OrchestratorResponse> {
    return await this.generateSmartNarrative(context.userId, context.parameters);
  }

  private async handleMemoryAnalysis(context: TaskContext): Promise<OrchestratorResponse> {
    return await this.analyzeMemoryCollection(context.userId);
  }

  private async handleStoryImprovement(context: TaskContext): Promise<OrchestratorResponse> {
    const { introduction, chapters, conclusion } = context.parameters;
    
    if (!introduction || !chapters || !conclusion) {
      throw new Error('Story improvement requires introduction, chapters, and conclusion');
    }

    const analysis = await storyEditorService.analyzeStory(
      introduction,
      chapters,
      conclusion,
      context.userProfile
    );

    const repairedStory = await storyEditorService.repairStory(
      introduction,
      chapters,
      conclusion,
      analysis,
      context.userProfile
    );

    const qualityAssessment = storyEditorService.getQualityAssessment(repairedStory.finalScore);

    return {
      content: `Story improved! Quality increased by ${repairedStory.qualityImprovement} points (${qualityAssessment.level}). Fixed ${repairedStory.issuesFixed} issues with ${repairedStory.changeLog.length} changes.`,
      actions: [{
        id: 'story-repair',
        type: 'improve_story',
        description: `Applied automated improvements to story`,
        status: 'completed',
        result: repairedStory
      }],
      suggestions: analysis.suggestions.map(s => s.description),
      metadata: {
        analysis,
        repairedStory,
        qualityAssessment
      }
    };
  }

  private analyzeMemoryPatterns(memories: any[], userProfile: UserProfile): any {
    // Extract themes and patterns from memories
    const themes = new Set<string>();
    const timePatterns: any[] = [];
    const emotionalTones: any[] = [];

    memories.forEach(memory => {
      // Simple keyword extraction for themes
      const content = (memory.title + ' ' + memory.content).toLowerCase();
      
      // Common life themes
      const themeKeywords = {
        family: ['family', 'parent', 'mother', 'father', 'sibling', 'child'],
        career: ['work', 'job', 'career', 'professional', 'colleague', 'office'],
        education: ['school', 'university', 'college', 'learn', 'study', 'graduation'],
        relationships: ['friend', 'relationship', 'love', 'partner', 'wedding', 'date'],
        travel: ['travel', 'trip', 'vacation', 'journey', 'visit', 'adventure'],
        achievements: ['achievement', 'success', 'accomplish', 'win', 'award', 'promotion'],
        challenges: ['challenge', 'difficult', 'problem', 'struggle', 'overcome', 'hardship'],
        hobbies: ['hobby', 'passion', 'interest', 'sport', 'music', 'art', 'reading']
      };

      Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => content.includes(keyword))) {
          themes.add(theme);
        }
      });

      // Emotional tone analysis (simple)
      const positiveWords = ['happy', 'joy', 'love', 'amazing', 'wonderful', 'excited', 'proud'];
      const negativeWords = ['sad', 'difficult', 'challenging', 'hard', 'struggle', 'problem'];
      
      const positiveCount = positiveWords.filter(word => content.includes(word)).length;
      const negativeCount = negativeWords.filter(word => content.includes(word)).length;
      
      let tone = 'neutral';
      if (positiveCount > negativeCount) tone = 'positive';
      if (negativeCount > positiveCount) tone = 'reflective';
      
      emotionalTones.push(tone);
    });

    return {
      themes: Array.from(themes),
      dominantTone: this.getMostCommon(emotionalTones),
      memoryCount: memories.length,
      averageLength: memories.reduce((sum, m) => sum + (m.content?.length || 0), 0) / memories.length
    };
  }

  private identifyProfileGaps(userProfile: UserProfile): string[] {
    const gaps: string[] = [];
    
    if (!userProfile.preferred_name) gaps.push('preferred_name');
    if (!userProfile.age) gaps.push('age');
    if (!userProfile.location) gaps.push('location');
    if (!userProfile.occupation) gaps.push('occupation');
    if (!userProfile.family_members || userProfile.family_members.length === 0) gaps.push('family_members');
    if (!userProfile.hobbies_interests || userProfile.hobbies_interests.length === 0) gaps.push('hobbies_interests');
    if (!userProfile.core_values || userProfile.core_values.length === 0) gaps.push('core_values');
    if (!userProfile.cultural_background || userProfile.cultural_background.length === 0) gaps.push('cultural_background');
    
    return gaps;
  }

  private generatePersonalizedSuggestions(memoryInsights: any, profileGaps: string[]): string[] {
    const suggestions: string[] = [];
    
    // Profile-based suggestions
    if (profileGaps.includes('family_members')) {
      suggestions.push('Add family member information to personalize your stories');
    }
    if (profileGaps.includes('hobbies_interests')) {
      suggestions.push('Share your hobbies and interests for more engaging narratives');
    }
    if (profileGaps.includes('core_values')) {
      suggestions.push('Define your core values to add depth to your story');
    }

    // Memory-based suggestions
    if (memoryInsights.memoryCount < 5) {
      suggestions.push('Add more memories to create a richer life story');
    }
    if (memoryInsights.themes.length < 3) {
      suggestions.push('Explore different life areas like career, relationships, and hobbies');
    }
    if (memoryInsights.averageLength < 100) {
      suggestions.push('Add more detail to your memories for more engaging stories');
    }

    // Theme-specific suggestions
    if (!memoryInsights.themes.includes('family') && !profileGaps.includes('family_members')) {
      suggestions.push('Consider adding memories about family experiences');
    }
    if (!memoryInsights.themes.includes('achievements')) {
      suggestions.push('Share your accomplishments and proud moments');
    }
    if (!memoryInsights.themes.includes('relationships')) {
      suggestions.push('Add memories about friendships and relationships');
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  private getMostCommon<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    
    const counts = array.reduce((acc, item) => {
      acc[item as string] = (acc[item as string] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).reduce((a, b) => 
      counts[a[0]] > counts[b[0]] ? a : b
    )[0] as T;
  }
}

// Export both for backward compatibility and new functionality
export const orchestratorService = new EnhancedOrchestratorService();
export const enhancedOrchestratorService = new EnhancedOrchestratorService();
