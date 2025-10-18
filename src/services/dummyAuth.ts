// Dummy authentication service for development/demo
// This creates a fake user session to bypass real authentication

export interface DummyUser {
  id: string;
  email: string;
  created_at: string;
}

export const DUMMY_USER: DummyUser = {
  id: 'demo-user-123-456-789',
  email: 'demo@solinone.com',
  created_at: new Date().toISOString()
};

export const createDummySession = () => {
  return {
    user: DUMMY_USER,
    access_token: 'dummy-token-for-development',
    expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
    token_type: 'bearer'
  };
};

export const isDummyMode = () => {
  return localStorage.getItem('useDummyAuth') === 'true';
};

export const enableDummyMode = () => {
  localStorage.setItem('useDummyAuth', 'true');
  console.log('🎭 Dummy auth mode enabled - using demo user for development');
};

export const disableDummyMode = () => {
  localStorage.removeItem('useDummyAuth');
  console.log('🔐 Dummy auth mode disabled - using real authentication');
};