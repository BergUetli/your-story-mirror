/**
 * Intelligent Memory Prompting Service
 * Analyzes user memory patterns and generates personalized follow-up questions
 */

interface MemoryPattern {
  id: string;
  title: string;
  text: string;
  memory_date?: string;
  memory_location?: string;
  tags?: string[];
  created_at: string;
}

interface UserMemoryProfile {
  totalMemories: number;
  timeRanges: {
    childhood: number;
    teenage: number;
    adult: number;
    recent: number;
  };
  commonThemes: string[];
  locations: string[];
  emotionalTone: 'positive' | 'mixed' | 'reflective';
  detailLevel: 'brief' | 'detailed';
  preferredTopics: string[];
}

export class IntelligentPromptingService {
  
  /**
   * Analyzes user's memory patterns to create a profile
   */
  analyzeMemoryProfile(memories: MemoryPattern[]): UserMemoryProfile {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Analyze time ranges (rough estimates)
    const timeRanges = {
      childhood: 0,
      teenage: 0,
      adult: 0,
      recent: 0
    };
    
    // Extract themes from memory content
    const allText = memories.map(m => `${m.title} ${m.text}`).join(' ').toLowerCase();
    const themeWords = this.extractThemes(allText);
    
    // Analyze locations
    const locations = memories
      .map(m => m.memory_location)
      .filter(Boolean)
      .slice(0, 5); // Top 5 locations
    
    // Determine emotional tone and detail level
    const avgLength = memories.reduce((sum, m) => sum + m.text.length, 0) / memories.length;
    const detailLevel = avgLength > 200 ? 'detailed' : 'brief';
    
    const emotionalWords = this.countEmotionalWords(allText);
    const emotionalTone = emotionalWords.positive > emotionalWords.negative ? 'positive' : 
                         emotionalWords.mixed > 5 ? 'mixed' : 'reflective';
    
    return {
      totalMemories: memories.length,
      timeRanges,
      commonThemes: themeWords.slice(0, 8),
      locations: locations as string[],
      emotionalTone,
      detailLevel,
      preferredTopics: this.identifyPreferredTopics(memories)
    };
  }

  /**
   * Generates intelligent follow-up questions based on recent memory and user profile
   */
  generateFollowUpQuestions(
    recentMemory: MemoryPattern, 
    profile: UserMemoryProfile,
    conversationContext: string[]
  ): string[] {
    const questions: string[] = [];
    
    // Memory-specific questions
    const memoryQuestions = this.getMemorySpecificQuestions(recentMemory);
    questions.push(...memoryQuestions.slice(0, 2));
    
    // Profile-based questions
    const profileQuestions = this.getProfileBasedQuestions(recentMemory, profile);
    questions.push(...profileQuestions.slice(0, 2));
    
    // Context-aware questions (avoid repetition)
    const contextQuestions = this.getContextAwareQuestions(recentMemory, conversationContext);
    questions.push(...contextQuestions.slice(0, 1));
    
    // Return top 3 most relevant questions
    return this.rankQuestions(questions, recentMemory, profile).slice(0, 3);
  }

  /**
   * Suggests conversation starters based on user's memory patterns
   */
  generateConversationStarters(profile: UserMemoryProfile): string[] {
    const starters: string[] = [];
    
    if (profile.commonThemes.includes('family')) {
      starters.push("I'd love to hear about a family tradition that was meaningful to you.");
      starters.push("What's a lesson someone in your family taught you that you still carry with you?");
    }
    
    if (profile.commonThemes.includes('work') || profile.commonThemes.includes('career')) {
      starters.push("Tell me about a moment at work when you felt really proud of what you accomplished.");
      starters.push("What's something you learned in your career that surprised you?");
    }
    
    if (profile.locations.length > 0) {
      const location = profile.locations[0];
      starters.push(`I noticed you've mentioned ${location} before. What made that place special to you?`);
    }
    
    if (profile.totalMemories < 3) {
      starters.push("What's a moment from your childhood that always makes you smile when you think about it?");
      starters.push("Tell me about a time when someone showed you unexpected kindness.");
    } else {
      starters.push("You've shared some wonderful memories. Is there a theme or pattern you notice in what brings you joy?");
    }
    
    // Always include some universal starters
    starters.push(
      "What's something you've learned about yourself recently?",
      "Tell me about a place that holds special meaning for you.",
      "What's a small moment that had a big impact on your life?"
    );
    
    return starters.slice(0, 5);
  }

  /**
   * Creates smart prompts for when users seem stuck or quiet
   */
  generateReflectionPrompts(profile: UserMemoryProfile, lastTopic?: string): string[] {
    const prompts: string[] = [];
    
    if (lastTopic) {
      prompts.push(`That ${lastTopic} memory was really meaningful. Does it remind you of any other experiences?`);
      prompts.push(`What about that ${lastTopic} story feels most important to preserve?`);
    }
    
    if (profile.emotionalTone === 'positive') {
      prompts.push("You seem to have such rich, joyful memories. What do you think has contributed to that?");
    } else if (profile.emotionalTone === 'reflective') {
      prompts.push("I can tell you think deeply about your experiences. What insights have emerged from reflecting on your life?");
    }
    
    // Encourage deeper exploration
    prompts.push(
      "Sometimes the quiet moments are the most meaningful. Any of those come to mind?",
      "What's something about your younger self that you'd want to tell them now?",
      "Is there a belief or value you hold that has a story behind it?"
    );
    
    return prompts.slice(0, 3);
  }

  // Helper methods
  private extractThemes(text: string): string[] {
    const themeKeywords = {
      family: ['family', 'mother', 'father', 'mom', 'dad', 'brother', 'sister', 'parent', 'child', 'daughter', 'son'],
      work: ['work', 'job', 'career', 'office', 'boss', 'colleague', 'business', 'company'],
      school: ['school', 'teacher', 'class', 'student', 'education', 'college', 'university'],
      travel: ['travel', 'trip', 'vacation', 'visit', 'journey', 'plane', 'airport'],
      friendship: ['friend', 'friendship', 'buddy', 'companion', 'social'],
      love: ['love', 'relationship', 'marriage', 'partner', 'romantic', 'dating'],
      achievement: ['proud', 'accomplishment', 'success', 'achievement', 'won', 'award'],
      challenge: ['difficult', 'hard', 'struggle', 'challenge', 'overcome', 'tough'],
      celebration: ['birthday', 'celebration', 'party', 'holiday', 'festival', 'anniversary'],
      nature: ['nature', 'outside', 'park', 'mountain', 'beach', 'forest', 'garden']
    };
    
    const themes: { [key: string]: number } = {};
    
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      const count = keywords.reduce((sum, keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        return sum + (text.match(regex) || []).length;
      }, 0);
      if (count > 0) themes[theme] = count;
    });
    
    return Object.entries(themes)
      .sort(([,a], [,b]) => b - a)
      .map(([theme]) => theme);
  }

  private countEmotionalWords(text: string): { positive: number; negative: number; mixed: number } {
    const positiveWords = ['happy', 'joy', 'love', 'wonderful', 'amazing', 'beautiful', 'proud', 'excited', 'grateful'];
    const negativeWords = ['sad', 'difficult', 'hard', 'struggle', 'pain', 'worry', 'fear', 'loss'];
    const mixedWords = ['bittersweet', 'complex', 'challenging', 'growth', 'learning', 'change'];
    
    const countWords = (words: string[]) => 
      words.reduce((sum, word) => sum + (text.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length, 0);
    
    return {
      positive: countWords(positiveWords),
      negative: countWords(negativeWords),
      mixed: countWords(mixedWords)
    };
  }

  private identifyPreferredTopics(memories: MemoryPattern[]): string[] {
    // Analyze what topics user tends to elaborate on
    const topics = memories.map(m => {
      const length = m.text.length;
      const themes = this.extractThemes(`${m.title} ${m.text}`);
      return themes.map(theme => ({ theme, length }));
    }).flat();
    
    const topicLengths: { [key: string]: number[] } = {};
    topics.forEach(({ theme, length }) => {
      if (!topicLengths[theme]) topicLengths[theme] = [];
      topicLengths[theme].push(length);
    });
    
    return Object.entries(topicLengths)
      .map(([theme, lengths]) => ({
        theme,
        avgLength: lengths.reduce((a, b) => a + b, 0) / lengths.length
      }))
      .sort((a, b) => b.avgLength - a.avgLength)
      .map(({ theme }) => theme)
      .slice(0, 5);
  }

  private getMemorySpecificQuestions(memory: MemoryPattern): string[] {
    const questions: string[] = [];
    
    // Location-based questions
    if (memory.memory_location) {
      questions.push(`What else do you remember about ${memory.memory_location}?`);
      questions.push(`How did ${memory.memory_location} shape that experience?`);
    }
    
    // Time-based questions
    if (memory.memory_date) {
      questions.push(`What was going on in your life around that time?`);
      questions.push(`How do you think you've changed since then?`);
    }
    
    // Content-based questions
    const themes = this.extractThemes(`${memory.title} ${memory.text}`);
    if (themes.includes('family')) {
      questions.push(`How did your family react to that situation?`);
      questions.push(`Does that remind you of other family moments?`);
    }
    
    if (themes.includes('achievement')) {
      questions.push(`What did that accomplishment teach you about yourself?`);
      questions.push(`Who was the first person you wanted to share that success with?`);
    }
    
    return questions;
  }

  private getProfileBasedQuestions(memory: MemoryPattern, profile: UserMemoryProfile): string[] {
    const questions: string[] = [];
    
    // Questions based on user's preferred topics
    profile.preferredTopics.forEach(topic => {
      if (topic === 'family' && !memory.text.toLowerCase().includes('family')) {
        questions.push(`Does this story connect to any family memories?`);
      }
      if (topic === 'work' && !memory.text.toLowerCase().includes('work')) {
        questions.push(`Did this experience influence your career path at all?`);
      }
    });
    
    // Questions based on detail level
    if (profile.detailLevel === 'detailed') {
      questions.push(`What details about that day do you remember most vividly?`);
      questions.push(`Can you paint me a picture of what you were feeling in that moment?`);
    } else {
      questions.push(`What's one thing about that experience that stands out?`);
      questions.push(`How would you summarize what that meant to you?`);
    }
    
    return questions;
  }

  private getContextAwareQuestions(memory: MemoryPattern, context: string[]): string[] {
    const questions: string[] = [];
    const recentTopics = context.slice(-5).join(' ').toLowerCase();
    
    // Avoid repetitive questions
    if (!recentTopics.includes('family') && memory.text.toLowerCase().includes('family')) {
      questions.push(`Tell me more about the family dynamics in this story.`);
    }
    
    if (!recentTopics.includes('feeling') && !recentTopics.includes('emotion')) {
      questions.push(`What emotions come up when you think about this memory?`);
    }
    
    if (!recentTopics.includes('learn') && !recentTopics.includes('teach')) {
      questions.push(`What did this experience teach you?`);
    }
    
    return questions;
  }

  private rankQuestions(questions: string[], memory: MemoryPattern, profile: UserMemoryProfile): string[] {
    // Simple ranking: prioritize questions that match user's preferred style
    return questions.sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      
      // Prefer questions matching user's detail level
      if (profile.detailLevel === 'detailed') {
        if (a.includes('details') || a.includes('picture') || a.includes('vividly')) scoreA += 2;
        if (b.includes('details') || b.includes('picture') || b.includes('vividly')) scoreB += 2;
      }
      
      // Prefer questions about user's favorite topics
      profile.preferredTopics.forEach(topic => {
        if (a.toLowerCase().includes(topic)) scoreA += 1;
        if (b.toLowerCase().includes(topic)) scoreB += 1;
      });
      
      return scoreB - scoreA;
    });
  }
}

export const intelligentPrompting = new IntelligentPromptingService();