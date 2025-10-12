import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  age: number | null;
  birth_date: string | null;
  birth_place: string | null;
  current_location: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Mock profile for testing when not authenticated
const mockProfile: UserProfile = {
  id: 'mock-id',
  user_id: 'mock-user-id',
  name: 'Demo User',
  email: 'demo@example.com',
  age: 35,
  birth_date: '1990-03-15',
  birth_place: 'San Francisco, CA',
  current_location: 'New York, NY',
  onboarding_completed: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProfile = async () => {
    if (!user) {
      // Use mock profile when not authenticated for demo purposes
      setProfile(mockProfile);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setProfile(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return data;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  const createProfile = async (profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          ...profileData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return data;
    } catch (err: any) {
      console.error('Error creating profile:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const needsOnboarding = user && (!profile || !profile.onboarding_completed);

  return {
    profile,
    loading,
    error,
    needsOnboarding,
    updateProfile,
    createProfile,
    refetchProfile: fetchProfile
  };
};