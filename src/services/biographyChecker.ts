/**
 * PROPRIETARY BIOGRAPHY CHECKER AGENT
 * 
 * Advanced editorial analysis system that reviews biographical narratives for:
 * - Flow and coherence
 * - Tone consistency 
 * - Emotional balance and positivity
 * - Narrative structure optimization
 * - Content enhancement suggestions
 * 
 * This is a proprietary system with configurable analysis parameters.
 * Configuration should be set via environment variables for security.
 */

interface BiographyAnalysis {
  overall_score: number; // 0-100
  flow_score: number;
  tone_score: number;
  positivity_score: number;
  suggestions: string[];
  enhanced_narrative?: string;
  issues_found: string[];
  strengths: string[];
}

interface BiographyCheckerConfig {
  api_endpoint?: string;
  api_key?: string;
  model_version?: string;
  analysis_depth?: 'basic' | 'standard' | 'comprehensive';
  enable_enhancement?: boolean;
  tone_preference?: 'neutral' | 'optimistic' | 'reflective';
}

class BiographyCheckerService {
  private config: BiographyCheckerConfig;
  private isEnabled: boolean;

  constructor() {
    this.config = this.loadConfiguration();
    this.isEnabled = this.validateConfiguration();
    
    if (!this.isEnabled) {
      console.warn('📝 Biography Checker: Service disabled - configuration missing');
    } else {
      console.log('✅ Biography Checker: Service initialized');
    }
  }

  /**
   * Load configuration from environment variables
   * This keeps the implementation details private while allowing configuration
   */
  private loadConfiguration(): BiographyCheckerConfig {
    return {
      api_endpoint: process.env.REACT_APP_BIOGRAPHY_CHECKER_ENDPOINT,
      api_key: process.env.REACT_APP_BIOGRAPHY_CHECKER_API_KEY,
      model_version: process.env.REACT_APP_BIOGRAPHY_CHECKER_VERSION || 'v1',
      analysis_depth: (process.env.REACT_APP_BIOGRAPHY_ANALYSIS_DEPTH as any) || 'standard',
      enable_enhancement: process.env.REACT_APP_BIOGRAPHY_ENABLE_ENHANCEMENT === 'true',
      tone_preference: (process.env.REACT_APP_BIOGRAPHY_TONE_PREFERENCE as any) || 'optimistic'
    };
  }

  /**
   * Validate that required configuration is present
   */
  private validateConfiguration(): boolean {
    return !!(this.config.api_endpoint && this.config.api_key);
  }

  /**
   * Main analysis method - analyzes biography for editorial quality
   */
  async analyzeBiography(
    introduction: string,
    chapters: Array<{ title: string; content: string; memories: any[] }>,
    conclusion: string,
    userPreferences?: { tone?: string; focus?: string[] }
  ): Promise<BiographyAnalysis> {
    
    if (!this.isEnabled) {
      return this.getFallbackAnalysis(introduction, chapters, conclusion);
    }

    try {
      console.log('🔍 Biography Checker: Starting analysis...');

      const fullNarrative = this.constructFullNarrative(introduction, chapters, conclusion);
      
      const analysisRequest = {
        narrative: fullNarrative,
        chapters: chapters.map(ch => ({
          title: ch.title,
          content: ch.content,
          memory_count: ch.memories.length
        })),
        user_preferences: userPreferences,
        config: {
          analysis_depth: this.config.analysis_depth,
          tone_preference: this.config.tone_preference,
          enable_enhancement: this.config.enable_enhancement
        }
      };

      const response = await fetch(this.config.api_endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api_key}`,
          'X-Model-Version': this.config.model_version!
        },
        body: JSON.stringify(analysisRequest)
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
      }

      const analysis = await response.json();
      
      console.log('✅ Biography Checker: Analysis completed', {
        score: analysis.overall_score,
        suggestions: analysis.suggestions.length,
        enhanced: !!analysis.enhanced_narrative
      });

      return analysis;

    } catch (error) {
      console.error('❌ Biography Checker: Analysis failed', error);
      return this.getFallbackAnalysis(introduction, chapters, conclusion);
    }
  }

  /**
   * Provides basic analysis when the proprietary service is unavailable
   */
  private getFallbackAnalysis(
    introduction: string,
    chapters: Array<{ title: string; content: string; memories: any[] }>,
    conclusion: string
  ): BiographyAnalysis {
    console.log('📝 Biography Checker: Using fallback analysis');

    const fullText = this.constructFullNarrative(introduction, chapters, conclusion);
    const wordCount = fullText.split(' ').length;
    const sentenceCount = fullText.split(/[.!?]+/).length;
    const avgSentenceLength = wordCount / sentenceCount;

    // Simple heuristic analysis
    const flow_score = this.calculateFlowScore(chapters, avgSentenceLength);
    const tone_score = this.calculateToneScore(fullText);
    const positivity_score = this.calculatePositivityScore(fullText);
    const overall_score = Math.round((flow_score + tone_score + positivity_score) / 3);

    const suggestions = this.generateBasicSuggestions(
      wordCount, 
      chapters.length, 
      flow_score, 
      tone_score, 
      positivity_score
    );

    return {
      overall_score,
      flow_score,
      tone_score,
      positivity_score,
      suggestions,
      issues_found: suggestions.filter(s => s.includes('Consider') || s.includes('Try')),
      strengths: this.identifyStrengths(chapters.length, wordCount, overall_score)
    };
  }

  private constructFullNarrative(
    introduction: string,
    chapters: Array<{ title: string; content: string }>,
    conclusion: string
  ): string {
    let narrative = introduction + '\n\n';
    
    chapters.forEach(chapter => {
      narrative += `${chapter.title}\n${chapter.content}\n\n`;
    });
    
    narrative += conclusion;
    return narrative;
  }

  private calculateFlowScore(chapters: any[], avgSentenceLength: number): number {
    let score = 70; // Base score
    
    // Reward appropriate sentence length (15-25 words is good for biography)
    if (avgSentenceLength >= 15 && avgSentenceLength <= 25) {
      score += 15;
    } else if (avgSentenceLength < 10 || avgSentenceLength > 35) {
      score -= 10;
    }

    // Reward chapter balance
    if (chapters.length >= 3 && chapters.length <= 7) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  private calculateToneScore(text: string): number {
    const positiveWords = ['wonderful', 'amazing', 'beautiful', 'happy', 'joy', 'love', 'success', 'growth', 'meaningful', 'inspiring'];
    const negativeWords = ['terrible', 'awful', 'horrible', 'hate', 'failure', 'devastating', 'nightmare', 'disaster'];
    const neutralWords = ['remember', 'experience', 'journey', 'time', 'moment', 'life', 'story', 'chapter'];

    const words = text.toLowerCase().split(/\W+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    const neutralCount = words.filter(word => neutralWords.includes(word)).length;

    const totalEmotionalWords = positiveCount + negativeCount;
    if (totalEmotionalWords === 0) return 75; // Neutral baseline

    const positivityRatio = positiveCount / totalEmotionalWords;
    return Math.round(50 + (positivityRatio * 50)); // 50-100 scale
  }

  private calculatePositivityScore(text: string): number {
    const hopefulWords = ['future', 'tomorrow', 'continue', 'grow', 'learn', 'discover', 'opportunity', 'possibility'];
    const gratitudeWords = ['grateful', 'thankful', 'blessed', 'appreciate', 'cherish', 'treasure'];
    const strengthWords = ['overcome', 'resilient', 'strong', 'determined', 'courage', 'persevered'];

    const words = text.toLowerCase().split(/\W+/);
    let score = 60; // Base positivity

    // Reward hopeful language
    hopefulWords.forEach(word => {
      if (words.includes(word)) score += 5;
    });

    // Reward gratitude expressions
    gratitudeWords.forEach(word => {
      if (words.includes(word)) score += 7;
    });

    // Reward strength/resilience themes
    strengthWords.forEach(word => {
      if (words.includes(word)) score += 6;
    });

    return Math.min(100, score);
  }

  private generateBasicSuggestions(
    wordCount: number,
    chapterCount: number,
    flowScore: number,
    toneScore: number,
    positivityScore: number
  ): string[] {
    const suggestions: string[] = [];

    if (wordCount < 200) {
      suggestions.push('Consider expanding your narrative with more detail about key moments and their significance.');
    }

    if (chapterCount < 3) {
      suggestions.push('Try organizing your story into more distinct life chapters for better narrative structure.');
    }

    if (flowScore < 70) {
      suggestions.push('Consider varying sentence length and adding transition phrases between different time periods.');
    }

    if (toneScore < 60) {
      suggestions.push('Try incorporating more descriptive and emotionally engaging language to bring your story to life.');
    }

    if (positivityScore < 70) {
      suggestions.push('Consider highlighting the lessons learned and personal growth from challenging experiences.');
    }

    if (suggestions.length === 0) {
      suggestions.push('Your biography shows strong narrative structure and emotional depth. Consider adding more specific details about pivotal moments.');
    }

    return suggestions;
  }

  private identifyStrengths(chapterCount: number, wordCount: number, overallScore: number): string[] {
    const strengths: string[] = [];

    if (chapterCount >= 4) {
      strengths.push('Well-organized narrative structure with clear life chapters');
    }

    if (wordCount > 400) {
      strengths.push('Rich, detailed storytelling with substantial content');
    }

    if (overallScore > 80) {
      strengths.push('Excellent emotional balance and narrative flow');
    }

    if (strengths.length === 0) {
      strengths.push('Authentic personal voice and genuine emotional expression');
    }

    return strengths;
  }

  /**
   * Quick positivity check for real-time feedback
   */
  async quickPositivityCheck(text: string): Promise<{ score: number; suggestions: string[] }> {
    const score = this.calculatePositivityScore(text);
    const suggestions: string[] = [];

    if (score < 60) {
      suggestions.push('Consider adding what you learned or how you grew from this experience');
      suggestions.push('Try mentioning any positive outcomes or silver linings');
    }

    return { score, suggestions };
  }

  /**
   * Check if the service is properly configured
   */
  isServiceAvailable(): boolean {
    return this.isEnabled;
  }

  /**
   * Get service status for debugging
   */
  getServiceStatus(): { enabled: boolean; version: string; endpoint_configured: boolean } {
    return {
      enabled: this.isEnabled,
      version: this.config.model_version || 'unknown',
      endpoint_configured: !!this.config.api_endpoint
    };
  }
}

// Export singleton instance
export const biographyChecker = new BiographyCheckerService();

// Export types for use in components
export type { BiographyAnalysis, BiographyCheckerConfig };