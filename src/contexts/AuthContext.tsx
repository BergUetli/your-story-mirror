import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
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

// Create Supabase client using Lovable's integration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

let supabase: any = null;
let isSupabaseAvailable = false;

try {
  // In Lovable, these should be automatically available when Supabase is connected
  if (supabaseUrl && supabaseAnonKey && 
      supabaseUrl !== 'https://placeholder.supabase.co' && 
      supabaseAnonKey !== 'placeholder-key') {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    isSupabaseAvailable = true;
    console.log('✅ Supabase client initialized successfully');
  } else {
    console.warn('❌ Supabase not properly configured. Please check your Lovable Supabase integration.');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Key:', supabaseAnonKey ? supabaseAnonKey.slice(0, 20) + '...' : 'undefined');
  }
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error);
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseAvailable || !supabase) {
      console.warn('⚠️ Supabase not available - this might mean:');
      console.warn('1. Supabase integration is not properly connected in Lovable');
      console.warn('2. Authentication is not enabled in your Supabase project');
      console.warn('3. Environment variables are not properly set');
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      console.log('📋 Initial session loaded:', session ? '✅ User logged in' : '❌ No user');
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session ? '✅ User present' : '❌ No user');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    console.log('🔐 SignUp attempt - isSupabaseAvailable:', isSupabaseAvailable, 'supabase:', !!supabase);
    
    if (!isSupabaseAvailable || !supabase) {
      console.error('❌ SignUp failed: Authentication service not available');
      return { error: { message: 'Authentication service not available. Please ensure Supabase is properly connected in your Lovable project settings.' } };
    }

    try {
      console.log('📤 Attempting signUp with Supabase...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      console.log('📥 SignUp result:', { data: !!data, error: error?.message || 'none' });
      return { error };
    } catch (error: any) {
      console.error('💥 SignUp error:', error);
      return { error: { message: error.message || 'Unknown signup error' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 SignIn attempt - isSupabaseAvailable:', isSupabaseAvailable, 'supabase:', !!supabase);
    
    if (!isSupabaseAvailable || !supabase) {
      console.error('❌ SignIn failed: Authentication service not available');
      return { error: { message: 'Authentication service not available. Please ensure Supabase is properly connected in your Lovable project settings.' } };
    }

    try {
      console.log('📤 Attempting signIn with Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('📥 SignIn result:', { data: !!data, error: error?.message || 'none' });
      return { error };
    } catch (error: any) {
      console.error('💥 SignIn error:', error);
      return { error: { message: error.message || 'Unknown signin error' } };
    }
  };

  const signOut = async () => {
    if (!isSupabaseAvailable || !supabase) {
      // For fallback mode, just clear local state
      setUser(null);
      setSession(null);
      return;
    }

    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseAvailable || !supabase) {
      return { error: { message: 'Password reset service not available. Please ensure Supabase is properly connected.' } };
    }

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (error: any) {
      return { error: { message: error.message || 'Unknown password reset error' } };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};