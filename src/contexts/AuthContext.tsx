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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<any>(null);
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState(false);

  useEffect(() => {
    // Initialize Supabase client with error handling
    const initializeSupabase = () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseAnonKey) {
          const client = createClient(supabaseUrl, supabaseAnonKey);
          setSupabase(client);
          setIsSupabaseAvailable(true);
          return client;
        } else {
          console.warn('Supabase environment variables not found. Authentication will use localStorage fallback.');
          setIsSupabaseAvailable(false);
          setLoading(false);
          return null;
        }
      } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        setIsSupabaseAvailable(false);
        setLoading(false);
        return null;
      }
    };

    const client = initializeSupabase();
    
    if (client && isSupabaseAvailable) {
      // Get initial session
      client.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      // Listen for auth changes
      const { data: { subscription } } = client.auth.onAuthStateChange(
        async (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      return () => subscription.unsubscribe();
    }
  }, [isSupabaseAvailable]);

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseAvailable || !supabase) {
      return { error: { message: 'Authentication service not available. Please contact support.' } };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseAvailable || !supabase) {
      return { error: { message: 'Authentication service not available. Please contact support.' } };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
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
      return { error: { message: 'Password reset service not available. Please contact support.' } };
    }

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (error) {
      return { error };
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