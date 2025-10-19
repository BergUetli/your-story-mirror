/**
 * INTELLIGENT STORY EDITOR SERVICE
 * 
 * Analyzes generated narratives for structural, grammatical, and content issues.
 * Provides automated repair suggestions and implements fixes to improve story quality.
 * Ensures consistent tone, proper flow, and engaging storytelling.
 */

import { UserProfile } from './userProfileService';

export interface StoryAnalysis {
  overallScore: number; // 0-100
  issues: StoryIssue[];
  strengths: string[];
  suggestions: StorySuggestion[];
  readabilityScore: number;
  emotionalTone: string;
  structuralQuality: number;
}

export interface StoryIssue {
  id: string;
  type: 'grammar' | 'structure' | 'flow' | 'tone' | 'repetition' | 'clarity' | 'engagement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    section: 'introduction' | 'chapter' | 'conclusion';
    chapterIndex?: number;
    paragraph: number;
    sentence?: number;
  };
  originalText: string;
  suggestedFix?: string;
  automated: boolean; // Can be auto-fixed
}

export interface StorySuggestion {
  id: string;
  type: 'enhance' | 'restructure' | 'expand' | 'tone' | 'personalize';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  implementation: string;
  expectedImprovement: string;
}

export interface StorySection {
  type: 'introduction' | 'chapter' | 'conclusion';
  title?: string;
  content: string;
  index?: number;
}

export interface RepairedStory {
  sections: StorySection[];
  changeLog: StoryChange[];
  qualityImprovement: number;
  issuesFixed: number;
  finalScore: number;
}

export interface StoryChange {
  id: string;
  type: 'fix' | 'enhancement' | 'restructure';
  description: string;
  section: string;
  beforeText: string;
  afterText: string;
  reasoning: string;
}

class StoryEditorService {
  private readonly QUALITY_THRESHOLDS = {
    excellent: 90,
    good: 75,
    acceptable: 60,
    needsWork: 40,
    poor: 20
  };

  private readonly COMMON_ISSUES = {
    repetition: [
      /\b(the|and|but|so|very|really|quite|just|that)\b/gi,
      /\b(amazing|wonderful|incredible|fantastic)\b/gi,
      /\b(journey|story|life|experience)\b/gi
    ],
    weakTransitions: [
      /^(Then|Next|After that|Later|Finally)/,
      /\. (And|But|So) /g
    ],
    passiveVoice: [
      /\b(was|were|is|are|been|being)\s+\w+ed\b/gi,
      /\b(has|have|had)\s+been\s+\w+ed\b/gi
    ],
    vagueLanguage: [
      /\b(things|stuff|something|somehow|somewhere)\b/gi,
      /\b(kind of|sort of|pretty much|basically)\b/gi
    ]
  };

  /**
   * Analyze a story for quality, issues, and improvement opportunities
   */
  async analyzeStory(
    introduction: string,
    chapters: { title: string; content: string }[],
    conclusion: string,
    userProfile?: UserProfile
  ): Promise<StoryAnalysis> {
    try {
      console.log('📊 Analyzing story quality...');
      
      const sections: StorySection[] = [
        { type: 'introduction', content: introduction },
        ...chapters.map((ch, idx) => ({
          type: 'chapter' as const,
          title: ch.title,
          content: ch.content,
          index: idx
        })),
        { type: 'conclusion', content: conclusion }
      ];

      // Analyze each section for issues
      const allIssues: StoryIssue[] = [];
      
      for (const section of sections) {
        const sectionIssues = await this.analyzeSectionIssues(section);
        allIssues.push(...sectionIssues);
      }

      // Calculate readability and structural quality
      const readabilityScore = this.calculateReadabilityScore(sections);
      const structuralQuality = this.analyzeStructuralQuality(sections);
      const emotionalTone = this.analyzeEmotionalTone(sections);
      
      // Generate improvement suggestions
      const suggestions = this.generateSuggestions(allIssues, sections, userProfile);
      
      // Identify strengths
      const strengths = this.identifyStrengths(sections);
      
      // Calculate overall score
      const overallScore = this.calculateOverallScore(
        allIssues, 
        readabilityScore, 
        structuralQuality, 
        sections.length
      );

      console.log(`✅ Story analysis complete: ${overallScore}/100 score, ${allIssues.length} issues found`);

      return {
        overallScore,
        issues: allIssues,
        strengths,
        suggestions,
        readabilityScore,
        emotionalTone,
        structuralQuality
      };
    } catch (error) {
      console.error('❌ Error analyzing story:', error);
      throw error;
    }
  }

  /**
   * Automatically repair a story based on analysis
   */
  async repairStory(
    introduction: string,
    chapters: { title: string; content: string }[],
    conclusion: string,
    analysis: StoryAnalysis,
    userProfile?: UserProfile
  ): Promise<RepairedStory> {
    try {
      console.log('🔧 Auto-repairing story...');
      
      const sections: StorySection[] = [
        { type: 'introduction', content: introduction },
        ...chapters.map((ch, idx) => ({
          type: 'chapter' as const,
          title: ch.title,
          content: ch.content,
          index: idx
        })),
        { type: 'conclusion', content: conclusion }
      ];

      const changeLog: StoryChange[] = [];
      let issuesFixed = 0;

      // Fix automated issues
      for (const section of sections) {
        const sectionIssues = analysis.issues.filter(issue => 
          issue.location.section === section.type &&
          (issue.location.chapterIndex === section.index || section.type !== 'chapter') &&
          issue.automated
        );

        for (const issue of sectionIssues) {
          const fix = await this.applyAutomatedFix(section, issue);
          if (fix) {
            changeLog.push(fix);
            issuesFixed++;
          }
        }
      }

      // Apply structural improvements
      const structuralImprovements = await this.applyStructuralImprovements(
        sections, 
        analysis, 
        userProfile
      );
      changeLog.push(...structuralImprovements);

      // Apply tone and style improvements
      const styleImprovements = await this.applyStyleImprovements(sections, analysis);
      changeLog.push(...styleImprovements);

      // Re-analyze to measure improvement
      const newAnalysis = await this.analyzeStory(
        sections[0].content,
        sections.slice(1, -1).map(s => ({ title: s.title || '', content: s.content })),
        sections[sections.length - 1].content,
        userProfile
      );

      const qualityImprovement = newAnalysis.overallScore - analysis.overallScore;

      console.log(`✅ Story repair complete: ${changeLog.length} changes, +${qualityImprovement} quality improvement`);

      return {
        sections,
        changeLog,
        qualityImprovement,
        issuesFixed,
        finalScore: newAnalysis.overallScore
      };
    } catch (error) {
      console.error('❌ Error repairing story:', error);
      throw error;
    }
  }

  /**
   * Analyze issues in a specific section
   */
  private async analyzeSectionIssues(section: StorySection): Promise<StoryIssue[]> {
    const issues: StoryIssue[] = [];
    const paragraphs = section.content.split('\n\n').filter(p => p.trim());

    for (let pIndex = 0; pIndex < paragraphs.length; pIndex++) {
      const paragraph = paragraphs[pIndex];
      
      // Check for repetition issues
      issues.push(...this.findRepetitionIssues(paragraph, section, pIndex));
      
      // Check for weak transitions
      issues.push(...this.findTransitionIssues(paragraph, section, pIndex));
      
      // Check for passive voice overuse
      issues.push(...this.findPassiveVoiceIssues(paragraph, section, pIndex));
      
      // Check for vague language
      issues.push(...this.findVagueLanguageIssues(paragraph, section, pIndex));
      
      // Check sentence structure
      issues.push(...this.analyzeSentenceStructure(paragraph, section, pIndex));
      
      // Check paragraph flow
      if (pIndex > 0) {
        issues.push(...this.analyzeTransitionFlow(paragraphs[pIndex - 1], paragraph, section, pIndex));
      }
    }

    return issues;
  }

  private findRepetitionIssues(text: string, section: StorySection, paragraph: number): StoryIssue[] {
    const issues: StoryIssue[] = [];
    
    // Check for word repetition
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(wordCounts).forEach(([word, count]) => {
      if (count > 3 && !['that', 'with', 'from', 'this', 'they', 'their', 'them'].includes(word)) {
        issues.push({
          id: `rep-${section.type}-${paragraph}-${word}`,
          type: 'repetition',
          severity: count > 5 ? 'high' : 'medium',
          description: `Word "${word}" appears ${count} times in this paragraph`,
          location: {
            section: section.type,
            chapterIndex: section.index,
            paragraph
          },
          originalText: text,
          suggestedFix: this.generateSynonymReplacement(text, word),
          automated: true
        });
      }
    });

    return issues;
  }

  private findTransitionIssues(text: string, section: StorySection, paragraph: number): StoryIssue[] {
    const issues: StoryIssue[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    sentences.forEach((sentence, sIndex) => {
      this.COMMON_ISSUES.weakTransitions.forEach(pattern => {
        if (pattern.test(sentence)) {
          issues.push({
            id: `trans-${section.type}-${paragraph}-${sIndex}`,
            type: 'flow',
            severity: 'medium',
            description: 'Weak or overused transition word detected',
            location: {
              section: section.type,
              chapterIndex: section.index,
              paragraph,
              sentence: sIndex
            },
            originalText: sentence.trim(),
            suggestedFix: this.improveTransition(sentence.trim()),
            automated: true
          });
        }
      });
    });

    return issues;
  }

  private findPassiveVoiceIssues(text: string, section: StorySection, paragraph: number): StoryIssue[] {
    const issues: StoryIssue[] = [];
    const passiveMatches = text.match(/\b(was|were|is|are|been|being)\s+\w+ed\b/gi) || [];
    
    if (passiveMatches.length > 2) {
      issues.push({
        id: `passive-${section.type}-${paragraph}`,
        type: 'tone',
        severity: 'medium',
        description: `${passiveMatches.length} instances of passive voice detected`,
        location: {
          section: section.type,
          chapterIndex: section.index,
          paragraph
        },
        originalText: text,
        suggestedFix: this.convertToActiveVoice(text),
        automated: true
      });
    }

    return issues;
  }

  private findVagueLanguageIssues(text: string, section: StorySection, paragraph: number): StoryIssue[] {
    const issues: StoryIssue[] = [];
    
    this.COMMON_ISSUES.vagueLanguage.forEach(pattern => {
      const matches = text.match(pattern) || [];
      if (matches.length > 0) {
        issues.push({
          id: `vague-${section.type}-${paragraph}-${matches[0]}`,
          type: 'clarity',
          severity: 'low',
          description: `Vague language detected: "${matches[0]}"`,
          location: {
            section: section.type,
            chapterIndex: section.index,
            paragraph
          },
          originalText: text,
          suggestedFix: this.replaceVagueLanguage(text, matches[0]),
          automated: true
        });
      }
    });

    return issues;
  }

  private analyzeSentenceStructure(text: string, section: StorySection, paragraph: number): StoryIssue[] {
    const issues: StoryIssue[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    // Check for overly long sentences
    sentences.forEach((sentence, sIndex) => {
      const words = sentence.trim().split(/\s+/);
      if (words.length > 30) {
        issues.push({
          id: `long-sent-${section.type}-${paragraph}-${sIndex}`,
          type: 'structure',
          severity: 'medium',
          description: `Sentence is too long (${words.length} words)`,
          location: {
            section: section.type,
            chapterIndex: section.index,
            paragraph,
            sentence: sIndex
          },
          originalText: sentence.trim(),
          suggestedFix: this.breakLongSentence(sentence.trim()),
          automated: true
        });
      }
    });

    // Check for sentence variety
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length;

    if (variance < 10) { // Low sentence variety
      issues.push({
        id: `variety-${section.type}-${paragraph}`,
        type: 'structure',
        severity: 'low',
        description: 'Sentences lack variety in length and structure',
        location: {
          section: section.type,
          chapterIndex: section.index,
          paragraph
        },
        originalText: text,
        suggestedFix: this.improveSentenceVariety(text),
        automated: false
      });
    }

    return issues;
  }

  private analyzeTransitionFlow(prevParagraph: string, currentParagraph: string, section: StorySection, paragraph: number): StoryIssue[] {
    const issues: StoryIssue[] = [];
    
    // Check for abrupt transitions between paragraphs
    const prevEnd = prevParagraph.trim().slice(-50);
    const currentStart = currentParagraph.trim().slice(0, 50);
    
    // Simple heuristic: if no connecting words/themes, suggest transition
    const hasTransition = this.hasGoodTransition(prevEnd, currentStart);
    
    if (!hasTransition) {
      issues.push({
        id: `flow-${section.type}-${paragraph}`,
        type: 'flow',
        severity: 'medium',
        description: 'Abrupt transition between paragraphs',
        location: {
          section: section.type,
          chapterIndex: section.index,
          paragraph
        },
        originalText: currentParagraph,
        suggestedFix: this.improveTransitionBetweenParagraphs(prevParagraph, currentParagraph),
        automated: false
      });
    }

    return issues;
  }

  private calculateReadabilityScore(sections: StorySection[]): number {
    const fullText = sections.map(s => s.content).join(' ');
    const sentences = fullText.split(/[.!?]+/).filter(s => s.trim()).length;
    const words = fullText.split(/\s+/).filter(w => w.trim()).length;
    const syllables = this.countSyllables(fullText);

    // Flesch Reading Ease formula (modified)
    const avgSentenceLength = words / sentences;
    const avgSyllablesPerWord = syllables / words;
    
    const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    
    // Convert to 0-100 scale where higher is better
    return Math.max(0, Math.min(100, fleschScore));
  }

  private analyzeStructuralQuality(sections: StorySection[]): number {
    let score = 100;
    
    // Check introduction quality
    const intro = sections[0];
    if (intro.content.length < 200) score -= 10;
    if (!intro.content.includes('story') && !intro.content.includes('journey') && !intro.content.includes('life')) score -= 5;
    
    // Check chapter consistency
    const chapters = sections.filter(s => s.type === 'chapter');
    if (chapters.length > 0) {
      const chapterLengths = chapters.map(c => c.content.length);
      const avgLength = chapterLengths.reduce((a, b) => a + b, 0) / chapterLengths.length;
      const variance = chapterLengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / chapterLengths.length;
      
      if (variance > avgLength * 0.5) score -= 15; // Inconsistent chapter lengths
    }
    
    // Check conclusion quality
    const conclusion = sections[sections.length - 1];
    if (conclusion.content.length < 150) score -= 10;
    if (!conclusion.content.includes('continue') && !conclusion.content.includes('future') && !conclusion.content.includes('ahead')) score -= 5;
    
    return Math.max(0, score);
  }

  private analyzeEmotionalTone(sections: StorySection[]): string {
    const fullText = sections.map(s => s.content).join(' ').toLowerCase();
    
    const tones = {
      optimistic: ['hope', 'joy', 'bright', 'wonderful', 'amazing', 'beautiful', 'success', 'achievement'],
      reflective: ['remember', 'reflection', 'thoughtful', 'consider', 'ponder', 'wisdom', 'learning'],
      nostalgic: ['memories', 'past', 'childhood', 'remember', 'recall', 'looking back'],
      inspiring: ['inspire', 'motivate', 'courage', 'strength', 'overcome', 'achieve', 'dream']
    };

    const toneScores = Object.entries(tones).map(([tone, words]) => {
      const matches = words.filter(word => fullText.includes(word)).length;
      return { tone, score: matches };
    });

    const dominantTone = toneScores.reduce((a, b) => a.score > b.score ? a : b);
    return dominantTone.tone;
  }

  private generateSuggestions(issues: StoryIssue[], sections: StorySection[], userProfile?: UserProfile): StorySuggestion[] {
    const suggestions: StorySuggestion[] = [];
    
    // High-priority suggestions based on issues
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      suggestions.push({
        id: 'fix-critical',
        type: 'restructure',
        priority: 'high',
        title: 'Fix Critical Issues',
        description: `${criticalIssues.length} critical issues found that significantly impact readability`,
        implementation: 'Auto-fix grammar and structure issues, then manual review',
        expectedImprovement: 'Substantial improvement in story flow and clarity'
      });
    }

    // Personalization suggestions
    if (userProfile) {
      suggestions.push({
        id: 'personalize',
        type: 'personalize',
        priority: 'medium',
        title: 'Enhance Personalization',
        description: 'Incorporate more personal details from user profile',
        implementation: `Add references to ${userProfile.preferred_name}'s interests, values, and background`,
        expectedImprovement: 'More engaging and personally meaningful narrative'
      });
    }

    // Structure suggestions
    const chapters = sections.filter(s => s.type === 'chapter');
    if (chapters.length < 3) {
      suggestions.push({
        id: 'add-chapters',
        type: 'restructure',
        priority: 'medium',
        title: 'Expand Story Structure',
        description: 'Create additional chapters for better organization',
        implementation: 'Break existing content into thematic chapters',
        expectedImprovement: 'Better narrative flow and easier reading'
      });
    }

    return suggestions;
  }

  private identifyStrengths(sections: StorySection[]): string[] {
    const strengths: string[] = [];
    
    // Check for good length
    const totalLength = sections.reduce((sum, s) => sum + s.content.length, 0);
    if (totalLength > 2000) {
      strengths.push('Comprehensive narrative with good depth');
    }

    // Check for personal touches
    const personalWords = ['family', 'friend', 'love', 'memory', 'experience', 'journey'];
    const fullText = sections.map(s => s.content).join(' ').toLowerCase();
    const personalMatches = personalWords.filter(word => fullText.includes(word)).length;
    
    if (personalMatches > 5) {
      strengths.push('Rich personal details and relationships');
    }

    // Check for good structure
    if (sections.length >= 3) {
      strengths.push('Well-organized three-part structure');
    }

    return strengths;
  }

  private calculateOverallScore(issues: StoryIssue[], readability: number, structural: number, sectionCount: number): number {
    let score = 100;
    
    // Deduct for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 15; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });
    
    // Factor in readability (30% weight)
    score = score * 0.7 + (readability * 0.3);
    
    // Factor in structural quality (20% weight)
    score = score * 0.8 + (structural * 0.2);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Helper methods for fixes
  private generateSynonymReplacement(text: string, word: string): string {
    const synonyms: Record<string, string[]> = {
      'amazing': ['remarkable', 'extraordinary', 'incredible', 'wonderful'],
      'wonderful': ['marvelous', 'delightful', 'excellent', 'fantastic'],
      'journey': ['path', 'adventure', 'voyage', 'experience'],
      'story': ['narrative', 'tale', 'account', 'chronicle'],
      'experience': ['encounter', 'adventure', 'event', 'moment']
    };

    const alternatives = synonyms[word.toLowerCase()] || [word];
    const replacement = alternatives[Math.floor(Math.random() * alternatives.length)];
    
    return text.replace(new RegExp(`\\b${word}\\b`, 'gi'), replacement);
  }

  private improveTransition(sentence: string): string {
    const transitions: Record<string, string[]> = {
      'then': ['Subsequently', 'Following this', 'As a result'],
      'next': ['Moving forward', 'In the following period', 'Continuing on'],
      'after that': ['From that point', 'In the years that followed', 'Building on this']
    };

    const firstWord = sentence.split(' ')[0].toLowerCase();
    const alternatives = transitions[firstWord] || [firstWord];
    const replacement = alternatives[Math.floor(Math.random() * alternatives.length)];
    
    return sentence.replace(/^\w+/, replacement);
  }

  private convertToActiveVoice(text: string): string {
    // Simple passive to active voice conversion
    return text.replace(/\b(was|were)\s+(\w+ed)\s+by\s+(\w+)/gi, '$3 $2');
  }

  private replaceVagueLanguage(text: string, vagueWord: string): string {
    const replacements: Record<string, string> = {
      'things': 'experiences',
      'stuff': 'belongings',
      'something': 'an experience',
      'somehow': 'through careful planning',
      'kind of': 'somewhat',
      'sort of': 'rather',
      'basically': 'essentially'
    };

    const replacement = replacements[vagueWord.toLowerCase()] || vagueWord;
    return text.replace(new RegExp(`\\b${vagueWord}\\b`, 'gi'), replacement);
  }

  private breakLongSentence(sentence: string): string {
    // Find natural break points (conjunctions, relative clauses)
    const breakPoints = [', which', ', that', ', and', ', but', ', so'];
    
    for (const breakPoint of breakPoints) {
      if (sentence.includes(breakPoint)) {
        const parts = sentence.split(breakPoint);
        if (parts.length === 2 && parts[0].length > 15 && parts[1].length > 15) {
          return `${parts[0]}. ${parts[1].trim().charAt(0).toUpperCase()}${parts[1].trim().slice(1)}`;
        }
      }
    }
    
    return sentence; // Return original if no good break point found
  }

  private improveSentenceVariety(text: string): string {
    // This is a complex operation that would need more sophisticated NLP
    // For now, return original with a note
    return text + '\n[Editor note: Consider varying sentence lengths and structures for better flow]';
  }

  private hasGoodTransition(prevEnd: string, currentStart: string): boolean {
    // Simple check for connecting words or themes
    const transitionWords = ['however', 'meanwhile', 'additionally', 'furthermore', 'consequently'];
    const lowerStart = currentStart.toLowerCase();
    
    return transitionWords.some(word => lowerStart.includes(word)) ||
           this.hasThematicConnection(prevEnd, currentStart);
  }

  private hasThematicConnection(prevEnd: string, currentStart: string): boolean {
    // Extract key words and check for overlap
    const getKeyWords = (text: string) => 
      text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    
    const prevWords = getKeyWords(prevEnd);
    const currentWords = getKeyWords(currentStart);
    
    return prevWords.some(word => currentWords.includes(word));
  }

  private improveTransitionBetweenParagraphs(prevParagraph: string, currentParagraph: string): string {
    // Add a transitional sentence at the beginning of current paragraph
    const transitions = [
      'Building on this foundation,',
      'This experience led to',
      'In the years that followed,',
      'Continuing this journey,',
      'As life progressed,'
    ];
    
    const transition = transitions[Math.floor(Math.random() * transitions.length)];
    return `${transition} ${currentParagraph}`;
  }

  private countSyllables(text: string): number {
    // Simple syllable counting heuristic
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    return words.reduce((count, word) => {
      const vowels = word.match(/[aeiou]/g) || [];
      const syllables = Math.max(1, vowels.length - (word.endsWith('e') ? 1 : 0));
      return count + syllables;
    }, 0);
  }

  private async applyAutomatedFix(section: StorySection, issue: StoryIssue): Promise<StoryChange | null> {
    if (!issue.automated || !issue.suggestedFix) return null;

    const beforeText = section.content;
    section.content = issue.suggestedFix;

    return {
      id: `fix-${issue.id}`,
      type: 'fix',
      description: issue.description,
      section: `${section.type}${section.index !== undefined ? ` ${section.index + 1}` : ''}`,
      beforeText: issue.originalText,
      afterText: issue.suggestedFix,
      reasoning: `Automated fix for ${issue.type} issue`
    };
  }

  private async applyStructuralImprovements(
    sections: StorySection[], 
    analysis: StoryAnalysis, 
    userProfile?: UserProfile
  ): Promise<StoryChange[]> {
    const changes: StoryChange[] = [];
    
    // Add personal details if user profile is available
    if (userProfile && userProfile.preferred_name) {
      const intro = sections.find(s => s.type === 'introduction');
      if (intro && !intro.content.includes(userProfile.preferred_name)) {
        const beforeText = intro.content;
        intro.content = intro.content.replace(
          /This (individual|person)/gi, 
          userProfile.preferred_name
        );
        
        if (intro.content !== beforeText) {
          changes.push({
            id: 'personalize-intro',
            type: 'enhancement',
            description: 'Added personal name to introduction',
            section: 'introduction',
            beforeText,
            afterText: intro.content,
            reasoning: 'Personalization makes the narrative more engaging'
          });
        }
      }
    }

    return changes;
  }

  private async applyStyleImprovements(sections: StorySection[], analysis: StoryAnalysis): Promise<StoryChange[]> {
    const changes: StoryChange[] = [];
    
    // Improve emotional tone if too neutral
    if (analysis.emotionalTone === 'neutral') {
      for (const section of sections) {
        const beforeText = section.content;
        section.content = this.enhanceEmotionalTone(section.content);
        
        if (section.content !== beforeText) {
          changes.push({
            id: `tone-${section.type}`,
            type: 'enhancement',
            description: 'Enhanced emotional engagement',
            section: section.type,
            beforeText,
            afterText: section.content,
            reasoning: 'Added emotional depth to improve reader connection'
          });
        }
      }
    }

    return changes;
  }

  private enhanceEmotionalTone(text: string): string {
    // Add subtle emotional language
    return text
      .replace(/\bremember\b/gi, 'fondly remember')
      .replace(/\bexperience\b/gi, 'meaningful experience')
      .replace(/\bmoment\b/gi, 'cherished moment')
      .replace(/\btime\b/gi, 'precious time');
  }

  /**
   * Get quality assessment text
   */
  getQualityAssessment(score: number): { level: string; description: string; color: string } {
    if (score >= this.QUALITY_THRESHOLDS.excellent) {
      return {
        level: 'Excellent',
        description: 'Outstanding narrative quality with engaging flow and personalized content',
        color: 'text-green-600'
      };
    } else if (score >= this.QUALITY_THRESHOLDS.good) {
      return {
        level: 'Good',
        description: 'Well-structured story with minor areas for improvement',
        color: 'text-blue-600'
      };
    } else if (score >= this.QUALITY_THRESHOLDS.acceptable) {
      return {
        level: 'Acceptable',
        description: 'Readable narrative that would benefit from editing improvements',
        color: 'text-yellow-600'
      };
    } else if (score >= this.QUALITY_THRESHOLDS.needsWork) {
      return {
        level: 'Needs Work',
        description: 'Story requires significant editing to improve quality and flow',
        color: 'text-orange-600'
      };
    } else {
      return {
        level: 'Poor',
        description: 'Major structural and content issues require comprehensive revision',
        color: 'text-red-600'
      };
    }
  }
}

export const storyEditorService = new StoryEditorService();