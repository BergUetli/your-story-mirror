import { supabase } from '@/integrations/supabase/client';

// User Profile Interface matching database schema
export interface UserProfile {
  id: string;
  user_id: string;
  
  // Basic Information
  preferred_name?: string;
  age?: number;
  location?: string;
  occupation?: string;
  relationship_status?: string;
  
  // Personal Background
  cultural_background?: string[];
  languages_spoken?: string[];
  hometown?: string;
  education_background?: string;
  
  // Key Relationships
  family_members?: FamilyMember[];
  close_friends?: Friend[];
  significant_others?: SignificantOther[];
  
  // Life Experiences & Interests
  major_life_events?: LifeEvent[];
  hobbies_interests?: string[];
  career_history?: CareerEntry[];
  travel_experiences?: string[];
  
  // Values & Personality
  core_values?: string[];
  personality_traits?: string[];
  life_goals?: string[];
  fears_concerns?: string[];
  
  // Cultural & Social Context
  religious_spiritual_beliefs?: string;
  political_views?: string;
  social_causes?: string[];
  cultural_influences?: string[];
  
  // Communication Preferences
  communication_style?: string;
  topics_of_interest?: string[];
  sensitive_topics?: string[];
  
  // Profile Metadata
  onboarding_completed: boolean;
  first_conversation_completed: boolean;
  profile_completeness_score: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  first_conversation_completed_at?: string;
}

export interface FamilyMember {
  name: string;
  relationship: string; // father, mother, sibling, spouse, child, etc.
  description?: string;
  importance?: 'high' | 'medium' | 'low';
  age?: number;
  location?: string;
}

export interface Friend {
  name: string;
  relationship: string; // best friend, close friend, work friend, etc.
  description?: string;
  importance?: 'high' | 'medium' | 'low';
  how_met?: string;
  years_known?: number;
}

export interface SignificantOther {
  name?: string;
  relationship_type: string; // spouse, partner, ex-partner, etc.
  description?: string;
  duration?: string;
  status: 'current' | 'past';
}

export interface LifeEvent {
  event: string;
  year?: number;
  description?: string;
  impact?: 'positive' | 'negative' | 'neutral' | 'transformative';
  location?: string;
}

export interface CareerEntry {
  role: string;
  company?: string;
  years?: string;
  description?: string;
  achievements?: string[];
}

export class UserProfileService {
  private supabase = supabase;
  
  /**
   * Get user profile by user ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found - this is normal for new users
          return null;
        }
        throw error;
      }
      
      return data as UserProfile;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      throw error;
    }
  }
  
  /**
   * Create initial user profile
   */
  async createProfile(userId: string, initialData?: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const profileData = {
        user_id: userId,
        onboarding_completed: false,
        first_conversation_completed: false,
        profile_completeness_score: 0,
        ...initialData
      };
      
      const { data, error } = await this.supabase
        .from('user_profiles')
        .insert([profileData])
        .select()
        .single();
        
      if (error) throw error;
      
      console.log('✅ User profile created successfully');
      return data as UserProfile;
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      throw error;
    }
  }
  
  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      // Calculate profile completeness score
      const completenessScore = this.calculateCompletenessScore(updates);
      
      const updateData = {
        ...updates,
        profile_completeness_score: completenessScore,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await this.supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) throw error;
      
      console.log('✅ User profile updated successfully');
      return data as UserProfile;
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }
  
  /**
   * Mark first conversation as completed
   */
  async markFirstConversationCompleted(userId: string): Promise<UserProfile> {
    try {
      const updates = {
        first_conversation_completed: true,
        first_conversation_completed_at: new Date().toISOString(),
        onboarding_completed: true
      };
      
      return await this.updateProfile(userId, updates);
    } catch (error) {
      console.error('❌ Error marking first conversation completed:', error);
      throw error;
    }
  }
  
  /**
   * Get or create user profile
   */
  async getOrCreateProfile(userId: string): Promise<UserProfile> {
    try {
      let profile = await this.getProfile(userId);
      
      if (!profile) {
        console.log('📝 Creating new user profile...');
        profile = await this.createProfile(userId);
      }
      
      return profile;
    } catch (error) {
      console.error('❌ Error getting or creating profile:', error);
      throw error;
    }
  }
  
  /**
   * Check if user needs first conversation
   */
  async needsFirstConversation(userId: string): Promise<boolean> {
    try {
      const profile = await this.getProfile(userId);
      return !profile?.first_conversation_completed;
    } catch (error) {
      console.error('❌ Error checking first conversation status:', error);
      return true; // Default to needing first conversation on error
    }
  }
  
  /**
   * Add family member to profile
   */
  async addFamilyMember(userId: string, familyMember: FamilyMember): Promise<UserProfile> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) throw new Error('Profile not found');
      
      const updatedFamilyMembers = [
        ...(profile.family_members || []),
        familyMember
      ];
      
      return await this.updateProfile(userId, {
        family_members: updatedFamilyMembers
      });
    } catch (error) {
      console.error('❌ Error adding family member:', error);
      throw error;
    }
  }
  
  /**
   * Add life event to profile
   */
  async addLifeEvent(userId: string, lifeEvent: LifeEvent): Promise<UserProfile> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) throw new Error('Profile not found');
      
      const updatedLifeEvents = [
        ...(profile.major_life_events || []),
        lifeEvent
      ];
      
      return await this.updateProfile(userId, {
        major_life_events: updatedLifeEvents
      });
    } catch (error) {
      console.error('❌ Error adding life event:', error);
      throw error;
    }
  }
  
  /**
   * Calculate profile completeness score (0-100)
   */
  private calculateCompletenessScore(profile: Partial<UserProfile>): number {
    let score = 0;
    const maxScore = 100;
    
    // Basic information (5 points each)
    if (profile.preferred_name) score += 5;
    if (profile.age) score += 5;
    if (profile.location) score += 5;
    if (profile.occupation) score += 5;
    
    // Relationships (10 points each for having content)
    if (profile.family_members && profile.family_members.length > 0) score += 10;
    if (profile.close_friends && profile.close_friends.length > 0) score += 10;
    
    // Interests and values (5 points each)
    if (profile.hobbies_interests && profile.hobbies_interests.length > 0) score += 5;
    if (profile.core_values && profile.core_values.length > 0) score += 5;
    if (profile.life_goals && profile.life_goals.length > 0) score += 5;
    
    // Cultural background (5 points each)
    if (profile.cultural_background && profile.cultural_background.length > 0) score += 5;
    if (profile.languages_spoken && profile.languages_spoken.length > 0) score += 5;
    
    // Life experiences (10 points each)
    if (profile.major_life_events && profile.major_life_events.length > 0) score += 10;
    if (profile.career_history && profile.career_history.length > 0) score += 10;
    
    // Personal insights (5 points each)
    if (profile.personality_traits && profile.personality_traits.length > 0) score += 5;
    if (profile.communication_style) score += 5;
    
    return Math.min(score, maxScore);
  }
  
  /**
   * Get profile summary for narrative AI
   */
  getProfileSummary(profile: UserProfile): string {
    const summary = [];
    
    if (profile.preferred_name) {
      summary.push(`Name: ${profile.preferred_name}`);
    }
    
    if (profile.age && profile.location) {
      summary.push(`Age ${profile.age}, lives in ${profile.location}`);
    }
    
    if (profile.occupation) {
      summary.push(`Works as: ${profile.occupation}`);
    }
    
    if (profile.family_members && profile.family_members.length > 0) {
      const familyNames = profile.family_members.map(fm => `${fm.name} (${fm.relationship})`).join(', ');
      summary.push(`Family: ${familyNames}`);
    }
    
    if (profile.hobbies_interests && profile.hobbies_interests.length > 0) {
      summary.push(`Interests: ${profile.hobbies_interests.join(', ')}`);
    }
    
    if (profile.core_values && profile.core_values.length > 0) {
      summary.push(`Values: ${profile.core_values.join(', ')}`);
    }
    
    if (profile.cultural_background && profile.cultural_background.length > 0) {
      summary.push(`Cultural background: ${profile.cultural_background.join(', ')}`);
    }
    
    return summary.join('\n');
  }
}

export const userProfileService = new UserProfileService();