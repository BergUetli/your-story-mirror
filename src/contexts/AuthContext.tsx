import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  needsOnboarding: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  checkOnboardingStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    // Listen for auth changes FIRST to avoid missing events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Then get the current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Development auto-login disabled to allow proper new user testing
      // This was previously auto-signing in users which prevented testing the new user flow
      console.log('🔧 Development mode: Auto-login disabled for proper new user testing');
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting signup');
      const normalizedEmail = email.trim().toLowerCase();
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        console.error('❌ SignUp failed:', error);
      } else {
        console.log('📝 SignUp successful');
      }
      return { error };
    } catch (error) {
      console.error('❌ SignUp failed:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting signin');
      const normalizedEmail = email.trim().toLowerCase();

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        console.error('❌ SignIn failed:', error);
      } else {
        console.log('📝 SignIn successful');
      }
      return { error };
    } catch (error) {
      console.error('❌ SignIn failed:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('❌ SignOut failed:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('🔓 Requesting password reset');
      const normalizedEmail = email.trim().toLowerCase();
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl
      });

      if (error) {
        console.error('❌ Password reset failed:', error);
      } else {
        console.log('📝 Password reset email sent');
      }
      return { error };
    } catch (error) {
      console.error('❌ Password reset failed:', error);
      return { error };
    }
  };

  const checkOnboardingStatus = async () => {
    if (!user) {
      setNeedsOnboarding(false);
      return;
    }

    try {
      // Try user_profiles table first, fallback to users table
      let { data, error } = await supabase
        .from('user_profiles')
        .select('onboarding_completed, first_conversation_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      // If user_profiles table doesn't exist, try users table as fallback
      if (error && error.code === 'PGRST205') {
        console.log('📋 user_profiles table not found, using users table as fallback');
        const fallback = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();
        
        data = fallback.data ? { 
          onboarding_completed: fallback.data.onboarding_completed,
          first_conversation_completed: fallback.data.onboarding_completed // Assume same value
        } : null;
        error = fallback.error;
      }

      // If there's an error or no profile, user needs onboarding
      const needsOnboarding = !data || !data.onboarding_completed || !data.first_conversation_completed;
      
      console.log('🔍 Onboarding check:', {
        user_id: user.id,
        data,
        onboarding_completed: data?.onboarding_completed,
        first_conversation_completed: data?.first_conversation_completed,
        needsOnboarding,
        error: error?.message
      });
      
      setNeedsOnboarding(needsOnboarding);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setNeedsOnboarding(false);
    }
  };

  // Check onboarding status when user changes
  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  const value = {
    user,
    session,
    loading,
    needsOnboarding,
    signUp,
    signIn,
    signOut,
    resetPassword,
    checkOnboardingStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};