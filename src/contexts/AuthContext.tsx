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
  // TEMP: Mock user for testing - bypassing authentication
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  } as User;

  const [user, setUser] = useState<User | null>(mockUser);
  const [session, setSession] = useState<Session | null>({ user: mockUser } as Session);
  const [loading, setLoading] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false); // Skip onboarding for testing

  useEffect(() => {
  console.log('🧪 TESTING MODE: Authentication and onboarding bypassed');
  console.log('👤 Mock user created:', mockUser.id);
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting signup for:', email);
      
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      console.log('📝 SignUp result:', { data, error });
      return { error };
    } catch (error) {
      console.error('❌ SignUp failed:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting signin for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('📝 SignIn result:', { data, error });
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
      console.log('🔓 Requesting password reset for:', email);
      
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      console.log('📝 Password reset result:', { data, error });
      return { error };
    } catch (error) {
      console.error('❌ Password reset failed:', error);
      return { error };
    }
  };

  const checkOnboardingStatus = async () => {
    // Testing mode: skip DB checks for mock users
    if (!user || user.id.startsWith('test-')) {
      setNeedsOnboarding(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      setNeedsOnboarding(!data || !data.onboarding_completed);
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