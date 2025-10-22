/**
 * ENHANCED NARRATIVE SERVICE
 * 
 * Improved story structuring method that incorporates user profile data,
 * creates engaging narratives with proper flow, and uses intelligent editing.
 */

import { UserProfile, userProfileService } from './userProfileService';
import { storyEditorService, type StoryAnalysis, type RepairedStory } from './storyEditorService';
import { GroupedMemory } from '@/utils/memoryGrouping';

export interface EnhancedNarrativeContext {
  userProfile: UserProfile;
  memories: GroupedMemory[];
  biographyTopics?: {
    topic_category: string;
    topic_title: string;
    content: string;
  }[];
  preferences: {
    tone: 'warm' | 'reflective' | 'inspiring' | 'adventurous';
    style: 'chronological' | 'thematic' | 'milestone_based';
    length: 'concise' | 'detailed' | 'comprehensive';
    focus_areas?: string[];
  };
}

export interface EnhancedStoryStructure {
  title: string;
  introduction: string;
  chapters: StoryChapter[];
  conclusion: string;
  metadata: {
    wordCount: number;
    estimatedReadingTime: number;
    themes: string[];
    timeSpan: { start?: string; end?: string };
    qualityScore?: number;
  };
}

export interface StoryChapter {
  id: string;
  title: string;
  content: string;
  theme: string;
  timeframe?: {
    start?: string;
    end?: string;
    ageRange?: { min?: number; max?: number };
  };
  memoryIds: string[];
  emotionalTone: 'joyful' | 'reflective' | 'challenging' | 'transformative' | 'celebratory';
}

export interface NarrativeImprovement {
  originalStory: EnhancedStoryStructure;
  analysis: StoryAnalysis;
  repairedStory: RepairedStory;
  finalStory: EnhancedStoryStructure;
  improvementSummary: {
    qualityIncrease: number;
    issuesFixed: number;
    changesApplied: number;
    newQualityLevel: string;
  };
}

class EnhancedNarrativeService {
  /**
   * Generate a complete, high-quality narrative using user profile and memories
   */
  async generateEnhancedNarrative(context: EnhancedNarrativeContext): Promise<EnhancedStoryStructure> {
    try {
      console.log('📖 Generating enhanced narrative...');
      
      // Create story structure
      const storyStructure = await this.createStoryStructure(context);
      
      // Generate content for each section
      const introduction = await this.generatePersonalizedIntroduction(context);
      const chapters = await this.generateThematicChapters(context);
      const conclusion = await this.generateForwardLookingConclusion(context);
      
      const enhancedStory: EnhancedStoryStructure = {
        title: this.generateStoryTitle(context),
        introduction,
        chapters,
        conclusion,
        metadata: this.calculateMetadata(introduction, chapters, conclusion, context)
      };

      console.log('✅ Enhanced narrative generated successfully');
      return enhancedStory;
    } catch (error) {
      console.error('❌ Error generating enhanced narrative:', error);
      throw error;
    }
  }

  /**
   * Generate and automatically improve a narrative using the story editor
   */
  async generateAndImproveNarrative(context: EnhancedNarrativeContext): Promise<NarrativeImprovement> {
    try {
      console.log('🎯 Generating and improving narrative...');
      
      // Generate initial story
      const originalStory = await this.generateEnhancedNarrative(context);
      
      // Analyze story quality
      const analysis = await storyEditorService.analyzeStory(
        originalStory.introduction,
        originalStory.chapters.map(ch => ({ title: ch.title, content: ch.content })),
        originalStory.conclusion,
        context.userProfile
      );

      // Auto-repair if needed
      let finalStory = originalStory;
      let repairedStory: RepairedStory | null = null;

      if (analysis.overallScore < 75) { // Only auto-repair if score is below 75
        console.log(`🔧 Story quality score: ${analysis.overallScore}/100 - applying improvements...`);
        
        repairedStory = await storyEditorService.repairStory(
          originalStory.introduction,
          originalStory.chapters.map(ch => ({ title: ch.title, content: ch.content })),
          originalStory.conclusion,
          analysis,
          context.userProfile
        );

        // Rebuild story structure with repaired content
        finalStory = {
          ...originalStory,
          introduction: repairedStory.sections.find(s => s.type === 'introduction')?.content || originalStory.introduction,
          chapters: originalStory.chapters.map((ch, index) => {
            const repairedChapter = repairedStory?.sections.find(s => s.type === 'chapter' && s.index === index);
            return {
              ...ch,
              content: repairedChapter?.content || ch.content
            };
          }),
          conclusion: repairedStory.sections.find(s => s.type === 'conclusion')?.content || originalStory.conclusion
        };

        // Update metadata with new quality score
        finalStory.metadata = {
          ...finalStory.metadata,
          qualityScore: repairedStory.finalScore
        };
      } else {
        finalStory.metadata.qualityScore = analysis.overallScore;
      }

      const qualityAssessment = storyEditorService.getQualityAssessment(
        finalStory.metadata.qualityScore || analysis.overallScore
      );

      const improvementSummary = {
        qualityIncrease: repairedStory ? repairedStory.qualityImprovement : 0,
        issuesFixed: repairedStory ? repairedStory.issuesFixed : 0,
        changesApplied: repairedStory ? repairedStory.changeLog.length : 0,
        newQualityLevel: qualityAssessment.level
      };

      console.log(`✅ Narrative improvement complete: ${improvementSummary.qualityIncrease > 0 ? `+${improvementSummary.qualityIncrease}` : 'No changes needed'} quality improvement`);

      return {
        originalStory,
        analysis,
        repairedStory: repairedStory || {
          sections: [],
          changeLog: [],
          qualityImprovement: 0,
          issuesFixed: 0,
          finalScore: analysis.overallScore
        },
        finalStory,
        improvementSummary
      };
    } catch (error) {
      console.error('❌ Error in narrative improvement process:', error);
      throw error;
    }
  }

  /**
   * Create intelligent story structure based on context
   */
  private async createStoryStructure(context: EnhancedNarrativeContext): Promise<{chapters: string[], themes: string[]}> {
    const { userProfile, memories, preferences } = context;
    
    // Determine structural approach
    switch (preferences.style) {
      case 'chronological':
        return this.createChronologicalStructure(memories, userProfile);
      case 'thematic':
        return this.createThematicStructure(memories, userProfile);
      case 'milestone_based':
        return this.createMilestoneStructure(memories, userProfile);
      default:
        return this.createAdaptiveStructure(memories, userProfile);
    }
  }

  private createChronologicalStructure(memories: GroupedMemory[], userProfile: UserProfile): {chapters: string[], themes: string[]} {
    const chapters = [
      'Early Foundations',
      'Growing Years', 
      'Coming of Age',
      'Building a Life',
      'Present Adventures'
    ];
    
    const themes = [
      'childhood and family',
      'learning and discovery',
      'relationships and growth',
      'achievements and challenges',
      'current journey'
    ];

    return { chapters, themes };
  }

  private createThematicStructure(memories: GroupedMemory[], userProfile: UserProfile): {chapters: string[], themes: string[]} {
    // Extract themes from user profile and memories
    const profileThemes = [
      ...(userProfile.hobbies_interests || []),
      ...(userProfile.core_values || []),
      'relationships',
      'personal growth'
    ];

    const chapters = profileThemes.slice(0, 5).map(theme => 
      this.capitalizeWords(`The ${theme} Connection`)
    );

    return { chapters, themes: profileThemes };
  }

  private createMilestoneStructure(memories: GroupedMemory[], userProfile: UserProfile): {chapters: string[], themes: string[]} {
    const milestones = [
      'Foundation Years',
      'Defining Moments',
      'Major Transitions', 
      'Achievements & Growth',
      'Current Chapter'
    ];

    const themes = [
      'early experiences',
      'pivotal events',
      'life changes',
      'accomplishments',
      'ongoing story'
    ];

    return { chapters: milestones, themes };
  }

  private createAdaptiveStructure(memories: GroupedMemory[], userProfile: UserProfile): {chapters: string[], themes: string[]} {
    // Adaptive structure based on available data
    if (memories.length > 10) {
      return this.createChronologicalStructure(memories, userProfile);
    } else if (userProfile.core_values && userProfile.core_values.length > 0) {
      return this.createThematicStructure(memories, userProfile);
    } else {
      return this.createMilestoneStructure(memories, userProfile);
    }
  }

  /**
   * Generate personalized introduction using profile data
   */
  private async generatePersonalizedIntroduction(context: EnhancedNarrativeContext): Promise<string> {
    const { userProfile, memories, preferences } = context;
    
    const name = userProfile.preferred_name || 'This remarkable individual';
    const age = userProfile.age ? `, at ${userProfile.age} years old,` : '';
    const location = userProfile.location ? ` in ${userProfile.location}` : '';
    const occupation = userProfile.occupation ? ` as ${this.addArticle(userProfile.occupation)}` : '';
    
    // Create personality overview from profile
    const personality = this.createPersonalityOverview(userProfile);
    
    // Determine story span
    const storySpan = memories.length > 0 
      ? `across ${memories.length} cherished memories` 
      : 'through the experiences that have shaped their journey';

    // Tone-based opening
    const toneOpenings = {
      warm: `${name}'s story${age} is one that radiates warmth and connection${location}.`,
      reflective: `In the quiet moments of reflection${age}, ${name}'s journey${location} reveals layers of wisdom and growth.`,
      inspiring: `${name}${age} embodies the kind of spirit that inspires others${location}.`,
      adventurous: `Adventure and curiosity have always been at the heart of ${name}'s story${age}${location}.`
    };

    const opening = toneOpenings[preferences.tone] || toneOpenings.warm;
    
    // Core values integration
    const values = userProfile.core_values && userProfile.core_values.length > 0
      ? ` Guided by values of ${this.formatList(userProfile.core_values)},`
      : '';

    // Cultural background integration
    const cultural = userProfile.cultural_background && userProfile.cultural_background.length > 0
      ? ` Drawing from rich ${userProfile.cultural_background.join(' and ')} heritage,`
      : '';

    // Relationships overview
    const relationships = this.createRelationshipsOverview(userProfile);

    return `${opening} Working${occupation} and living a life that balances ${this.extractLifeBalance(userProfile)},${values}${cultural} ${name} has created ${storySpan} that tell a tale of authentic living and meaningful connections.

${personality}${relationships}

This is a story not just of events and achievements, but of a person who approaches life with ${this.extractApproachToLife(userProfile, preferences.tone)}, creating ripples of positive impact wherever they go. Each chapter that follows reveals another facet of a life lived with intention, courage, and an unwavering commitment to growth and connection.`;
  }

  /**
   * Generate thematic chapters based on memories and profile
   */
  private async generateThematicChapters(context: EnhancedNarrativeContext): Promise<StoryChapter[]> {
    const { userProfile, memories, preferences } = context;
    const structureInfo = await this.createStoryStructure(context);
    
    const chapters: StoryChapter[] = [];
    
    // Organize memories by themes
    const memoriesByTheme = this.organizeMemoriesByThemes(memories, structureInfo.themes);
    
    for (let i = 0; i < structureInfo.chapters.length; i++) {
      const chapterTitle = structureInfo.chapters[i];
      const theme = structureInfo.themes[i] || 'life experiences';
      const themeMemories = memoriesByTheme[theme] || [];
      
      const chapterContent = await this.generateChapterContent(
        chapterTitle,
        theme,
        themeMemories,
        userProfile,
        preferences
      );

      chapters.push({
        id: `chapter-${i}`,
        title: chapterTitle,
        content: chapterContent,
        theme,
        memoryIds: themeMemories.map(m => m.id),
        emotionalTone: this.determineEmotionalTone(theme, themeMemories),
        timeframe: this.calculateTimeframe(themeMemories, userProfile)
      });
    }

    return chapters;
  }

  /**
   * Generate forward-looking conclusion
   */
  private async generateForwardLookingConclusion(context: EnhancedNarrativeContext): Promise<string> {
    const { userProfile, preferences } = context;
    
    const name = userProfile.preferred_name || 'This individual';
    const goals = userProfile.life_goals && userProfile.life_goals.length > 0
      ? userProfile.life_goals.slice(0, 3)
      : ['continued growth', 'meaningful connections', 'purposeful living'];

    // Present moment acknowledgment
    const presentMoment = userProfile.location 
      ? `Today, in ${userProfile.location}, ${name} continues to write their story`
      : `Today, ${name} continues to write their story`;

    // Future aspirations
    const futureAspirations = goals.length > 0
      ? `with dreams that include ${this.formatList(goals)}`
      : 'with dreams that stretch toward new horizons';

    // Values-driven future
    const valuesDriven = userProfile.core_values && userProfile.core_values.length > 0
      ? ` The ${this.formatList(userProfile.core_values)} that have guided them thus far`
      : ' The principles that have guided them thus far';

    // Tone-specific conclusion
    const toneConclusions = {
      warm: 'radiating warmth and fostering connections that enrich both their life and the lives of others.',
      reflective: 'with thoughtful intention, understanding that each day offers new opportunities for wisdom and growth.',
      inspiring: 'as a beacon of possibility, showing others what it means to live authentically and pursue dreams with determination.',
      adventurous: 'with eyes wide open to new adventures, ready to embrace whatever exciting chapters lie ahead.'
    };

    const toneConclusion = toneConclusions[preferences.tone] || toneConclusions.reflective;

    return `${presentMoment}, ${futureAspirations}.${valuesDriven} will undoubtedly continue to shape the chapters yet to be written, ${toneConclusion}

The story you've just read is far from over. It's a living narrative, growing and evolving with each passing day, each new experience, each moment of connection and discovery. ${name}'s journey reminds us all that our stories are not just about where we've been, but about the endless potential of where we're going.

As this chapter closes, another begins—filled with promise, possibility, and the unwritten adventures that make life the extraordinary journey it is meant to be.`;
  }

  // Helper methods

  private createPersonalityOverview(userProfile: UserProfile): string {
    const traits = userProfile.personality_traits || [];
    const interests = userProfile.hobbies_interests || [];
    
    if (traits.length === 0 && interests.length === 0) {
      return 'Their character shines through in every interaction, bringing authenticity and depth to all they do.';
    }

    let overview = '';
    
    if (traits.length > 0) {
      overview += `Known for being ${this.formatList(traits)}, `;
    }

    if (interests.length > 0) {
      overview += `${name} finds joy in ${this.formatList(interests)}, `;
    }

    return overview + 'creating a life that reflects both passion and purpose.';
  }

  private createRelationshipsOverview(userProfile: UserProfile): string {
    const family = userProfile.family_members || [];
    const friends = userProfile.close_friends || [];
    
    if (family.length === 0 && friends.length === 0) {
      return 'They understand the importance of meaningful relationships and the role they play in shaping our stories.';
    }

    let overview = 'Surrounded by ';
    const relationships = [];
    
    if (family.length > 0) {
      const familyDesc = family.length === 1 
        ? `their ${family[0].relationship}` 
        : `a loving family including their ${family.map(f => f.relationship).join(' and ')}`;
      relationships.push(familyDesc);
    }

    if (friends.length > 0) {
      relationships.push(`close friends who share in life's adventures`);
    }

    return overview + this.formatList(relationships) + ', they understand that the richest stories are those shared with others.';
  }

  private extractLifeBalance(userProfile: UserProfile): string {
    const elements = [];
    
    if (userProfile.occupation) elements.push('professional growth');
    if (userProfile.hobbies_interests && userProfile.hobbies_interests.length > 0) {
      elements.push('personal interests');
    }
    if (userProfile.family_members && userProfile.family_members.length > 0) {
      elements.push('family connections');
    }
    if (userProfile.close_friends && userProfile.close_friends.length > 0) {
      elements.push('friendships');
    }
    
    return elements.length > 0 ? this.formatList(elements) : 'work and personal fulfillment';
  }

  private extractApproachToLife(userProfile: UserProfile, tone: string): string {
    const approaches = {
      warm: 'genuine warmth and openness',
      reflective: 'thoughtful consideration and wisdom',
      inspiring: 'determination and positive energy',
      adventurous: 'curiosity and boldness'
    };

    const baseApproach = approaches[tone] || 'authenticity and purpose';
    
    if (userProfile.core_values && userProfile.core_values.length > 0) {
      return `${baseApproach}, guided by their deep commitment to ${this.formatList(userProfile.core_values)}`;
    }

    return baseApproach;
  }

  private organizeMemoriesByThemes(memories: GroupedMemory[], themes: string[]): Record<string, GroupedMemory[]> {
    const organized: Record<string, GroupedMemory[]> = {};
    
    themes.forEach(theme => {
      organized[theme] = memories.filter(memory => 
        this.memoryMatchesTheme(memory, theme)
      );
    });

    // Distribute unmatched memories
    const matchedIds = new Set();
    Object.values(organized).forEach(themeMemories => 
      themeMemories.forEach(m => matchedIds.add(m.id))
    );

    const unmatchedMemories = memories.filter(m => !matchedIds.has(m.id));
    unmatchedMemories.forEach((memory, index) => {
      const themeIndex = index % themes.length;
      const theme = themes[themeIndex];
      organized[theme] = organized[theme] || [];
      organized[theme].push(memory);
    });

    return organized;
  }

  private memoryMatchesTheme(memory: GroupedMemory, theme: string): boolean {
    const lowerTheme = theme.toLowerCase();
    const memoryText = (memory.title + ' ' + (memory as any).content).toLowerCase();
    
    // Simple keyword matching - could be enhanced with NLP
    const themeKeywords: Record<string, string[]> = {
      'family': ['family', 'parent', 'mother', 'father', 'sibling', 'brother', 'sister'],
      'friendship': ['friend', 'buddy', 'companion'],
      'career': ['work', 'job', 'career', 'professional', 'colleague'],
      'education': ['school', 'university', 'college', 'learn', 'study'],
      'travel': ['travel', 'trip', 'vacation', 'journey', 'adventure'],
      'achievement': ['achievement', 'success', 'accomplish', 'win', 'award'],
      'challenge': ['challenge', 'difficult', 'overcome', 'struggle', 'problem'],
      'celebration': ['celebrate', 'party', 'birthday', 'anniversary', 'wedding'],
      'growth': ['learn', 'grow', 'develop', 'improve', 'change']
    };

    const keywords = themeKeywords[lowerTheme] || [lowerTheme];
    return keywords.some(keyword => memoryText.includes(keyword));
  }

  private async generateChapterContent(
    title: string,
    theme: string,
    memories: GroupedMemory[],
    userProfile: UserProfile,
    preferences: { tone: string; length: string }
  ): Promise<string> {
    const name = userProfile.preferred_name || 'They';
    
    if (memories.length === 0) {
      return this.generateThematicPlaceholderContent(title, theme, name, preferences.tone);
    }

    // Create narrative from memories
    const memoryNarratives = memories.map(memory => 
      this.transformMemoryToNarrative(memory, preferences.tone)
    );

    // Theme introduction
    const themeIntro = this.generateThemeIntroduction(title, theme, name, preferences.tone);
    
    // Weave memories into coherent narrative
    const weavedNarrative = this.weaveMemoriesIntoNarrative(
      memoryNarratives, 
      theme, 
      preferences.tone
    );

    // Theme conclusion
    const themeConclusion = this.generateThemeConclusion(theme, memories.length, preferences.tone);

    return `${themeIntro}\n\n${weavedNarrative}\n\n${themeConclusion}`;
  }

  private generateThematicPlaceholderContent(title: string, theme: string, name: string, tone: string): string {
    const toneDescriptions = {
      warm: `${name}'s journey through ${theme} has been marked by heartfelt connections and meaningful experiences.`,
      reflective: `In contemplating ${theme}, ${name} finds layers of meaning that continue to unfold with time.`,
      inspiring: `The ${theme} aspect of ${name}'s life demonstrates the power of perseverance and vision.`,
      adventurous: `${name}'s approach to ${theme} has always been characterized by curiosity and boldness.`
    };

    return toneDescriptions[tone] || toneDescriptions['reflective'] + 
           ` While specific memories from this period await capture, the impact of these experiences continues to shape their ongoing story, representing a foundation upon which future adventures and insights will build.`;
  }

  private transformMemoryToNarrative(memory: GroupedMemory, tone: string): string {
    const toneModifiers = {
      warm: ['heartwarming', 'touching', 'endearing'],
      reflective: ['meaningful', 'contemplative', 'insightful'],
      inspiring: ['remarkable', 'impressive', 'uplifting'],
      adventurous: ['exciting', 'thrilling', 'bold']
    };

    const modifiers = toneModifiers[tone] || toneModifiers['reflective'];
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];

    // Extract key elements from memory
    const title = memory.title;
    const content = (memory as any).content;
    
    // Transform into narrative prose
    return `In a ${modifier} turn of events, ${title.toLowerCase()}. ${content} This experience became a defining moment, illustrating the way life's unexpected gifts often come disguised as ordinary moments.`;
  }

  private generateThemeIntroduction(title: string, theme: string, name: string, tone: string): string {
    const toneIntros = {
      warm: `The warmth of ${name}'s experiences in ${theme} creates a tapestry of connection and love.`,
      reflective: `When examining the role of ${theme} in ${name}'s life, patterns of growth and wisdom emerge.`,
      inspiring: `${name}'s journey through ${theme} serves as a testament to the human capacity for growth and achievement.`,
      adventurous: `Adventure and discovery mark ${name}'s path through the realm of ${theme}.`
    };

    return toneIntros[tone] || toneIntros['reflective'];
  }

  private weaveMemoriesIntoNarrative(narratives: string[], theme: string, tone: string): string {
    if (narratives.length === 0) return '';
    
    if (narratives.length === 1) return narratives[0];
    
    // Add transitions between memories
    const transitions = {
      warm: ['Building on this foundation,', 'In the same spirit,', 'Continuing this thread of connection,'],
      reflective: ['This understanding deepened when,', 'Further reflection revealed,', 'Another layer of meaning emerged as,'],
      inspiring: ['This achievement paved the way for,', 'Building on this success,', 'Inspired by this experience,'],
      adventurous: ['The adventure continued as,', 'Next on this journey,', 'Further exploration led to,']
    };

    const toneTransitions = transitions[tone] || transitions['reflective'];
    
    let weavedNarrative = narratives[0];
    
    for (let i = 1; i < narratives.length; i++) {
      const transition = toneTransitions[i % toneTransitions.length];
      weavedNarrative += `\n\n${transition} ${narratives[i]}`;
    }

    return weavedNarrative;
  }

  private generateThemeConclusion(theme: string, memoryCount: number, tone: string): string {
    const toneConclusions = {
      warm: `These ${memoryCount} cherished moments in ${theme} continue to radiate warmth and influence in daily life.`,
      reflective: `Looking back on these ${memoryCount} experiences in ${theme}, the lessons learned continue to guide future decisions.`,
      inspiring: `The ${memoryCount} milestones in ${theme} stand as evidence of what's possible with determination and vision.`,
      adventurous: `These ${memoryCount} adventures in ${theme} fuel anticipation for the exciting chapters yet to be written.`
    };

    return toneConclusions[tone] || toneConclusions['reflective'];
  }

  private determineEmotionalTone(theme: string, memories: GroupedMemory[]): StoryChapter['emotionalTone'] {
    // Simple theme-based emotional tone assignment
    const themeEmotions: Record<string, StoryChapter['emotionalTone']> = {
      'family': 'joyful',
      'achievement': 'celebratory',
      'challenge': 'transformative',
      'growth': 'reflective',
      'celebration': 'celebratory'
    };

    return themeEmotions[theme] || 'reflective';
  }

  private calculateTimeframe(memories: GroupedMemory[], userProfile: UserProfile): StoryChapter['timeframe'] {
    if (memories.length === 0) return {};

    // Extract dates from memories (this would need to be implemented based on memory structure)
    // For now, return estimated based on user age
    if (userProfile.age) {
      return {
        ageRange: { min: Math.max(0, userProfile.age - 10), max: userProfile.age }
      };
    }

    return {};
  }

  private generateStoryTitle(context: EnhancedNarrativeContext): string {
    const { userProfile, preferences } = context;
    const name = userProfile.preferred_name || 'A Life';
    
    const titleTemplates = {
      warm: `${name}: A Story of Connection and Love`,
      reflective: `The Journey of ${name}: Reflections on a Life Well-Lived`,
      inspiring: `${name}: A Testament to Dreams and Determination`,
      adventurous: `The Adventures of ${name}: A Life of Bold Discoveries`
    };

    return titleTemplates[preferences.tone] || `The Story of ${name}`;
  }

  private calculateMetadata(
    introduction: string, 
    chapters: StoryChapter[], 
    conclusion: string, 
    context: EnhancedNarrativeContext
  ): EnhancedStoryStructure['metadata'] {
    const fullText = introduction + ' ' + chapters.map(ch => ch.content).join(' ') + ' ' + conclusion;
    const wordCount = fullText.split(/\s+/).length;
    const estimatedReadingTime = Math.ceil(wordCount / 250); // 250 words per minute
    
    const themes = [
      ...new Set([
        ...chapters.map(ch => ch.theme),
        ...(context.userProfile.core_values || []),
        ...(context.userProfile.hobbies_interests || [])
      ])
    ].slice(0, 10);

    return {
      wordCount,
      estimatedReadingTime,
      themes,
      timeSpan: {
        start: context.userProfile.age ? `Age ${Math.max(0, context.userProfile.age - 20)}` : undefined,
        end: context.userProfile.age ? `Age ${context.userProfile.age}` : 'Present'
      }
    };
  }

  // Utility methods

  private formatList(items: string[]): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items.join(' and ');
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  }

  private capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private addArticle(noun: string): string {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const article = vowels.includes(noun.charAt(0).toLowerCase()) ? 'an' : 'a';
    return `${article} ${noun}`;
  }
}

export const enhancedNarrativeService = new EnhancedNarrativeService();