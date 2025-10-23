import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Check if a user has admin privileges by querying the user_roles table
 * @param user - The authenticated user object
 * @returns Promise<boolean> - true if user has admin role, false otherwise
 */
export const isUserAdmin = async (user: User | null): Promise<boolean> => {
  if (!user || !user.id) {
    return false;
  }
  
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Exception checking admin role:', error);
    return false;
  }
};

/**
 * Check if current environment allows admin access (for development)
 * @returns boolean - true if in development mode
 */
export const isDevelopmentMode = (): boolean => {
  return process.env.NODE_ENV === 'development' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname.includes('sandbox');
};

/**
 * Comprehensive admin check - user must have admin role in database
 * @param user - The authenticated user object  
 * @returns Promise<boolean> - true if user can access admin features
 */
export const hasAdminAccess = async (user: User | null): Promise<boolean> => {
  return await isUserAdmin(user);
};
