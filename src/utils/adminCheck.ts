import { User } from '@supabase/supabase-js';

// Admin user emails - only these emails can access admin functionality
const ADMIN_EMAILS = [
  'admin@solinone.com',
  'team@bergutli.com', 
  'admin@example.com',
  // Add your actual admin email here when you know it
  // For now, development mode will allow access for testing
];

/**
 * Check if a user has admin privileges
 * @param user - The authenticated user object
 * @returns boolean - true if user is admin, false otherwise
 */
export const isUserAdmin = (user: User | null): boolean => {
  if (!user || !user.email) {
    return false;
  }
  
  return ADMIN_EMAILS.includes(user.email.toLowerCase().trim());
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
 * Comprehensive admin check - user must be admin OR in development mode
 * @param user - The authenticated user object  
 * @returns boolean - true if user can access admin features
 */
export const hasAdminAccess = (user: User | null): boolean => {
  return isUserAdmin(user) || isDevelopmentMode();
};