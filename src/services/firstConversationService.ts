import { userProfileService, type UserProfile, type FamilyMember, type LifeEvent } from './userProfileService';

export interface FirstConversationQuestion {
  id: string;
  question: string;
  category: 'basic' | 'relationships' | 'interests' | 'values' | 'experiences' | 'cultural';
  followUpQuestions?: string[];
  required: boolean;
  profileField?: keyof UserProfile;
}

export interface ConversationResponse {
  questionId: string;
  response: string;
  extractedData?: any;
  followUpNeeded?: boolean;
}

export class FirstConversationService {
  private questions: FirstConversationQuestion[] = [
    // Basic Information
    {
      id: 'name',
      question: "Hi! I'm Solin, your AI companion. I'm so excited to get to know you! What would you like me to call you?",
      category: 'basic',
      required: true,
      profileField: 'preferred_name'
    },
    {
      id: 'age_location',
      question: "It's wonderful to meet you, {name}! To help me understand your world better, could you tell me a bit about where you are in life? How old are you, and where do you call home?",
      category: 'basic',
      required: true,
      followUpQuestions: [
        "What do you love most about living in {location}?",
        "Have you always lived there, or did you move there from somewhere else?"
      ]
    },
    {
      id: 'occupation',
      question: "Tell me about what you do for work or study. What's your occupation or field of study?",
      category: 'basic',
      required: false,
      followUpQuestions: [
        "What drew you to that field?",
        "What's the most rewarding part of what you do?"
      ]
    },
    
    // Family and Relationships
    {
      id: 'family',
      question: "Family means different things to everyone. Could you tell me about the important people in your family? Who are the family members that matter most to you?",
      category: 'relationships',
      required: true,
      followUpQuestions: [
        "What makes your relationship with {family_member} special?",
        "Are there any family traditions that are important to you?"
      ]
    },
    {
      id: 'close_relationships',
      question: "Beyond family, who are the people closest to you? Tell me about your best friends or significant relationships.",
      category: 'relationships',
      required: false,
      followUpQuestions: [
        "How did you meet {friend_name}?",
        "What qualities do you value most in your friendships?"
      ]
    },
    
    // Cultural Background
    {
      id: 'cultural_heritage',
      question: "I'd love to understand your cultural background. What cultural or ethnic heritage do you identify with? Are there traditions, languages, or customs that are important to you?",
      category: 'cultural',
      required: false,
      followUpQuestions: [
        "Are there any cultural celebrations or traditions you particularly cherish?",
        "Do you speak any languages other than English?"
      ]
    },
    
    // Life Experiences
    {
      id: 'life_events',
      question: "Everyone has moments that shape who they are. Can you think of some significant events or experiences in your life that have been particularly meaningful - both positive challenges and celebrations?",
      category: 'experiences',
      required: false,
      followUpQuestions: [
        "How do you feel that experience changed or influenced you?",
        "What did you learn about yourself from that experience?"
      ]
    },
    
    // Interests and Values
    {
      id: 'interests',
      question: "What brings you joy in your free time? What are your hobbies, interests, or passions?",
      category: 'interests',
      required: false,
      followUpQuestions: [
        "What got you interested in {hobby}?",
        "Is there something you've always wanted to try but haven't yet?"
      ]
    },
    {
      id: 'values',
      question: "What values or principles are most important to you? What guides your decisions and how you treat others?",
      category: 'values',
      required: false,
      followUpQuestions: [
        "Can you give me an example of how this value shows up in your daily life?",
        "Where do you think this value comes from in your background?"
      ]
    },
    {
      id: 'goals_dreams',
      question: "Looking ahead, what are you hoping for in your life? What goals or dreams are you working toward?",
      category: 'values',
      required: false,
      followUpQuestions: [
        "What steps are you taking toward that goal?",
        "What would achieving that mean to you?"
      ]
    }
  ];

  /**
   * Get the next question in the first conversation flow
   */
  getNextQuestion(answeredQuestionIds: string[] = []): FirstConversationQuestion | null {
    // Find the first unanswered question
    const nextQuestion = this.questions.find(q => !answeredQuestionIds.includes(q.id));
    return nextQuestion || null;
  }

  /**
   * Get a follow-up question based on the response
   */
  getFollowUpQuestion(questionId: string, response: string, context: any = {}): string | null {
    const question = this.questions.find(q => q.id === questionId);
    if (!question?.followUpQuestions || question.followUpQuestions.length === 0) {
      return null;
    }

    // Select a relevant follow-up question
    let followUp = question.followUpQuestions[0];
    
    // Replace placeholders with context data
    if (context.name) {
      followUp = followUp.replace('{name}', context.name);
    }
    if (context.location) {
      followUp = followUp.replace('{location}', context.location);
    }
    if (context.family_member) {
      followUp = followUp.replace('{family_member}', context.family_member);
    }
    if (context.friend_name) {
      followUp = followUp.replace('{friend_name}', context.friend_name);
    }
    if (context.hobby) {
      followUp = followUp.replace('{hobby}', context.hobby);
    }

    return followUp;
  }

  /**
   * Process user response and extract structured data
   */
  async processResponse(
    questionId: string, 
    response: string, 
    userId: string,
    existingProfile?: UserProfile
  ): Promise<{ extractedData: any; suggestions: string[] }> {
    const question = this.questions.find(q => q.id === questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    let extractedData: any = {};
    let suggestions: string[] = [];

    switch (questionId) {
      case 'name':
        extractedData.preferred_name = this.extractName(response);
        break;

      case 'age_location':
        const ageLocationData = this.extractAgeLocation(response);
        extractedData = { ...extractedData, ...ageLocationData };
        break;

      case 'occupation':
        extractedData.occupation = response.trim();
        break;

      case 'family':
        const familyMembers = this.extractFamilyMembers(response);
        extractedData.family_members = familyMembers;
        suggestions = familyMembers.map(fm => 
          `Tell me more about your relationship with ${fm.name}`
        );
        break;

      case 'close_relationships':
        const friends = this.extractFriends(response);
        extractedData.close_friends = friends;
        break;

      case 'cultural_heritage':
        const culturalData = this.extractCulturalBackground(response);
        extractedData = { ...extractedData, ...culturalData };
        break;

      case 'life_events':
        const lifeEvents = this.extractLifeEvents(response);
        extractedData.major_life_events = lifeEvents;
        break;

      case 'interests':
        const interests = this.extractInterests(response);
        extractedData.hobbies_interests = interests;
        break;

      case 'values':
        const values = this.extractValues(response);
        extractedData.core_values = values;
        break;

      case 'goals_dreams':
        const goals = this.extractGoals(response);
        extractedData.life_goals = goals;
        break;
    }

    return { extractedData, suggestions };
  }

  /**
   * Complete the first conversation and update profile
   */
  async completeFirstConversation(
    userId: string,
    responses: ConversationResponse[]
  ): Promise<UserProfile> {
    try {
      let profile = await userProfileService.getOrCreateProfile(userId);
      
      // Aggregate all extracted data
      let aggregatedData: any = {};
      
      for (const response of responses) {
        const { extractedData } = await this.processResponse(
          response.questionId,
          response.response,
          userId,
          profile
        );
        aggregatedData = { ...aggregatedData, ...extractedData };
      }

      // Update profile with all collected data
      profile = await userProfileService.updateProfile(userId, aggregatedData);
      
      // Mark first conversation as completed
      profile = await userProfileService.markFirstConversationCompleted(userId);
      
      console.log('✅ First conversation completed successfully');
      return profile;
    } catch (error) {
      console.error('❌ Error completing first conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation progress
   */
  getConversationProgress(answeredQuestionIds: string[]): {
    completed: number;
    total: number;
    required: number;
    requiredCompleted: number;
    percentage: number;
  } {
    const total = this.questions.length;
    const completed = answeredQuestionIds.length;
    const requiredQuestions = this.questions.filter(q => q.required);
    const required = requiredQuestions.length;
    const requiredCompleted = requiredQuestions.filter(q => 
      answeredQuestionIds.includes(q.id)
    ).length;
    
    return {
      completed,
      total,
      required,
      requiredCompleted,
      percentage: Math.round((completed / total) * 100)
    };
  }

  // Helper methods for extracting data from responses
  private extractName(response: string): string {
    // Simple extraction - could be enhanced with NLP
    const cleanResponse = response.trim().replace(/[.,!?]/g, '');
    const words = cleanResponse.split(' ');
    
    // Look for common name patterns
    const nameIndicators = ['i\'m', 'im', 'call', 'name', 'my'];
    let nameIndex = -1;
    
    for (let i = 0; i < words.length; i++) {
      if (nameIndicators.includes(words[i].toLowerCase())) {
        nameIndex = i + 1;
        break;
      }
    }
    
    if (nameIndex > -1 && nameIndex < words.length) {
      return words[nameIndex];
    }
    
    // Fallback: assume first capitalized word is the name
    const capitalizedWords = words.filter(word => 
      word.length > 0 && word[0].toUpperCase() === word[0]
    );
    
    return capitalizedWords[0] || response.split(' ')[0];
  }

  private extractAgeLocation(response: string): any {
    const data: any = {};
    
    // Extract age (look for numbers)
    const ageMatch = response.match(/\b(\d{1,2})\b/);
    if (ageMatch) {
      const age = parseInt(ageMatch[1]);
      if (age >= 10 && age <= 120) {
        data.age = age;
      }
    }
    
    // Extract location (look for place names)
    const locationPatterns = [
      /(?:live in|from|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*,?\s*(?:city|town|state|country)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = response.match(pattern);
      if (match) {
        data.location = match[1].trim();
        break;
      }
    }
    
    return data;
  }

  private extractFamilyMembers(response: string): FamilyMember[] {
    const familyMembers: FamilyMember[] = [];
    
    // Common family relationship terms
    const relationships = {
      'mom': 'mother', 'mother': 'mother', 'mama': 'mother', 'mommy': 'mother',
      'dad': 'father', 'father': 'father', 'papa': 'father', 'daddy': 'father',
      'brother': 'brother', 'bro': 'brother', 
      'sister': 'sister', 'sis': 'sister',
      'wife': 'spouse', 'husband': 'spouse', 'spouse': 'spouse',
      'son': 'son', 'daughter': 'daughter',
      'grandmother': 'grandmother', 'grandma': 'grandmother', 'granny': 'grandmother',
      'grandfather': 'grandfather', 'grandpa': 'grandfather'
    };
    
    // Extract family members mentioned
    const words = response.toLowerCase().split(/[\s,;]+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?]/g, '');
      
      if (relationships[word]) {
        // Look for a name nearby
        let name = '';
        
        // Check if there's a name before or after the relationship
        if (i > 0 && /^[A-Z][a-z]+$/.test(words[i-1])) {
          name = words[i-1];
        } else if (i < words.length - 1 && /^[A-Z][a-z]+$/.test(words[i+1])) {
          name = words[i+1];
        }
        
        familyMembers.push({
          name: name || `My ${relationships[word]}`,
          relationship: relationships[word],
          importance: 'high' // Default to high for mentioned family
        });
      }
    }
    
    return familyMembers;
  }

  private extractFriends(response: string): any[] {
    // Similar logic to family members but for friends
    const friends: any[] = [];
    
    // Look for friend indicators and names
    const friendPatterns = [
      /(?:friend|buddy|pal)\s+(?:named\s+)?([A-Z][a-z]+)/gi,
      /([A-Z][a-z]+)\s+(?:is my|my)\s+(?:best\s+)?friend/gi
    ];
    
    for (const pattern of friendPatterns) {
      const matches = [...response.matchAll(pattern)];
      for (const match of matches) {
        friends.push({
          name: match[1],
          relationship: 'close friend',
          importance: 'high'
        });
      }
    }
    
    return friends;
  }

  private extractCulturalBackground(response: string): any {
    const data: any = {};
    
    // Extract cultural backgrounds/ethnicities
    const culturalTerms = response.match(/(?:heritage|background|culture|ethnicity|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi);
    if (culturalTerms) {
      data.cultural_background = culturalTerms.map(term => 
        term.replace(/^(?:heritage|background|culture|ethnicity|from)\s+/i, '').trim()
      );
    }
    
    // Extract languages
    const languagePatterns = [
      /speak\s+([A-Z][a-z]+)/gi,
      /(?:language|languages)\s*:?\s*([A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+)*)/gi
    ];
    
    const languages = [];
    for (const pattern of languagePatterns) {
      const matches = [...response.matchAll(pattern)];
      for (const match of matches) {
        languages.push(...match[1].split(',').map(lang => lang.trim()));
      }
    }
    
    if (languages.length > 0) {
      data.languages_spoken = languages;
    }
    
    return data;
  }

  private extractLifeEvents(response: string): LifeEvent[] {
    // Basic extraction - could be enhanced with NLP
    const events: LifeEvent[] = [];
    
    // Look for year patterns and event descriptions
    const yearMatches = [...response.matchAll(/(?:in\s+)?(\d{4})/g)];
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      const yearMatch = sentence.match(/(\d{4})/);
      const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
      
      if (sentence.trim().length > 10) { // Meaningful sentence
        events.push({
          event: sentence.trim(),
          year,
          impact: 'neutral' // Default - could be enhanced with sentiment analysis
        });
      }
    }
    
    return events;
  }

  private extractInterests(response: string): string[] {
    // Extract hobby/interest terms
    const interests: string[] = [];
    
    // Common hobby patterns
    const hobbyPatterns = [
      /(?:enjoy|like|love|into|hobby|hobbies|interest|interests)\s+([a-z]+(?:\s+[a-z]+)*)/gi,
      /(?:play|playing|do|doing)\s+([a-z]+(?:\s+[a-z]+)*)/gi
    ];
    
    for (const pattern of hobbyPatterns) {
      const matches = [...response.matchAll(pattern)];
      for (const match of matches) {
        const interest = match[1].trim();
        if (interest.length > 2) {
          interests.push(interest);
        }
      }
    }
    
    // Also split by common separators
    const commaSeparated = response.split(/,|and|\s+/).filter(word => 
      word.length > 3 && /^[a-z]+$/i.test(word.trim())
    );
    
    interests.push(...commaSeparated);
    
    // Remove duplicates and return
    return [...new Set(interests)].slice(0, 10); // Limit to 10 interests
  }

  private extractValues(response: string): string[] {
    const values: string[] = [];
    
    // Common value terms
    const valueWords = [
      'honesty', 'integrity', 'respect', 'kindness', 'compassion', 'loyalty',
      'justice', 'fairness', 'freedom', 'family', 'friendship', 'love',
      'trust', 'responsibility', 'excellence', 'creativity', 'growth',
      'learning', 'helping', 'service', 'community', 'tradition'
    ];
    
    const words = response.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      const cleanWord = word.replace(/[.,!?]/g, '');
      if (valueWords.includes(cleanWord)) {
        values.push(cleanWord);
      }
    }
    
    return [...new Set(values)];
  }

  private extractGoals(response: string): string[] {
    const goals: string[] = [];
    
    // Split by sentences and look for goal indicators
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const goalIndicators = ['want to', 'hope to', 'plan to', 'goal', 'dream', 'aspire'];
    
    for (const sentence of sentences) {
      const hasGoalIndicator = goalIndicators.some(indicator => 
        sentence.toLowerCase().includes(indicator)
      );
      
      if (hasGoalIndicator && sentence.trim().length > 10) {
        goals.push(sentence.trim());
      }
    }
    
    return goals.slice(0, 5); // Limit to 5 goals
  }
}

export const firstConversationService = new FirstConversationService();