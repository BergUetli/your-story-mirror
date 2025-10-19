import React, { useState, createContext, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

// Demo mode context
const DemoContext = createContext<{ isDemoMode: boolean; setDemoMode: (demo: boolean) => void } | undefined>(undefined);

export const useDemoMode = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoProvider');
  }
  return context;
};

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem('demoMode') === 'true';
  });

  const setDemoMode = (demo: boolean) => {
    setIsDemoMode(demo);
    localStorage.setItem('demoMode', demo.toString());
  };

  return (
    <DemoContext.Provider value={{ isDemoMode, setDemoMode }}>
      {children}
    </DemoContext.Provider>
  );
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { user, loading } = useAuth();
  const { isDemoMode, setDemoMode } = useDemoMode();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />
          <p className="text-muted-foreground">Loading your sanctuary...</p>
        </div>
      </div>
    );
  }

  // Allow access if user is authenticated
  if (user) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-memory to-accent bg-clip-text text-transparent">
              Welcome to Your Memory Sanctuary
            </h1>
            <p className="text-muted-foreground">
              Sign in to access your personal collection of memories and conversations with Solin.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={() => setShowAuthModal(true)}
              className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90"
              size="lg"
            >
              Enter Your Sanctuary
            </Button>
            
            {process.env.NODE_ENV === 'development' && (
              <Button
                onClick={async () => {
                  try {
                    console.log('🔧 Manual authentication attempt...');
                    const { supabase } = await import('@/integrations/supabase/client');
                    const { data, error } = await supabase.auth.signInWithPassword({
                      email: 'berguetli@gmail.com',
                      password: 'zippy6'
                    });
                    
                    if (error) {
                      console.error('Authentication failed:', error.message);
                      alert('Authentication failed: ' + error.message);
                    } else {
                      console.log('✅ Authentication successful');
                    }
                  } catch (error) {
                    console.error('Authentication error:', error);
                    alert('Authentication error: ' + error);
                  }
                }}
                variant="outline"
                className="w-full"
                size="sm"
              >
                🔧 Dev: Quick Login (berguetli@gmail.com)
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};