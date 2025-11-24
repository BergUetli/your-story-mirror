/**
 * NAVIGATION COMPONENT
 * 
 * This is the main navigation system for "You, Remembered" - providing access to all key
 * features and pages throughout the application. It serves as the primary way users navigate
 * between different sections of their memory preservation journey.
 * 
 * BUSINESS PURPOSE:
 * - Primary navigation hub for accessing core features (memory creation, timeline, AI reconstruction)
 * - Information gateway for learning about the platform ("How It Works")
 * - User control panel for managing their digital legacy
 * - Responsive design ensuring accessibility across all devices
 * 
 * KEY FEATURES:
 * - Responsive design: Desktop top navigation + Mobile bottom navigation
 * - Active page highlighting for clear user orientation
 * - Intuitive iconography for quick feature recognition
 * - Smooth transitions and hover effects for professional feel
 * - Fixed positioning for consistent access across all pages
 */

import { Button } from '@/components/ui/button';
import { Clock, Info, HelpCircle, Sparkles, Users, Shield, BookOpen, LogOut, Database, Settings as SettingsIcon, Infinity } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';

/**
 * MAIN NAVIGATION COMPONENT
 * 
 * Manages the entire navigation experience across the application, providing
 * access to information pages, core features, and user management tools.
 */
const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  /**
   * ALL NAVIGATION ITEMS
   * Consolidated list for UBS-style equal spacing layout
   */
  const navItems = user ? [
    { path: '/about', icon: Info, label: 'About' },
    { path: '/how-it-works', icon: HelpCircle, label: 'How It Works' },
    { path: '/timeline', icon: Clock, label: 'Timeline' },
    { path: '/archive', icon: Database, label: 'Archive' },
    { path: '/story', icon: BookOpen, label: 'Story' },
    { path: '/reconstruction', icon: Sparkles, label: 'Reconstruction' },
    { path: '/identities', icon: Users, label: 'Identities' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
    ...(user ? [{ path: '/admin', icon: Shield, label: 'Admin' }] : []),
  ] : [
    { path: '/about', icon: Info, label: 'About' },
    { path: '/how-it-works', icon: HelpCircle, label: 'How It Works' },
  ];

  /**
   * ACTIVE PAGE DETECTION
   * 
   * BUSINESS PURPOSE: Provides visual feedback to users about their current
   * location within the application, reducing confusion and improving navigation.
   */
  const isActive = (path: string) => location.pathname === path;

  /**
   * SIGN OUT HANDLER
   * 
   * BUSINESS PURPOSE: Allows users to properly sign out and return to the public
   * landing page, ensuring clean session management and proper onboarding flow
   * for subsequent users.
   */
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* 
        DESKTOP/TABLET NAVIGATION BAR - UBS Style
        Clean, minimal design with logo on left and equal spacing for nav items
      */}
      <div className="hidden sm:block fixed top-0 left-0 right-0 z-[2147483647] bg-white border-b shadow-sm isolate" style={{ borderColor: 'hsl(var(--border))', pointerEvents: 'auto' }}>
        <div className="max-w-7xl mx-auto px-8 relative" style={{ pointerEvents: 'auto' }}>
          <div className="flex items-center h-16" style={{ pointerEvents: 'auto' }}>
            {/* 
              LOGO SECTION (Left) - UBS-Inspired Style
              Bold, prominent logo with infinity symbol for timelessness
            */}
            {user ? (
              <Link 
                to="/" 
                className="flex items-center gap-3 mr-12 hover:opacity-80 transition-opacity relative z-20 pointer-events-auto cursor-pointer group"
                style={{ pointerEvents: 'auto' }}
              >
                <Infinity 
                  className="w-8 h-8 transition-transform group-hover:scale-110" 
                  style={{ 
                    color: 'hsl(var(--primary))',
                    strokeWidth: 2.5
                  }} 
                />
                <span 
                  className="text-2xl font-bold tracking-tight leading-none"
                  style={{ 
                    color: 'hsl(var(--primary))',
                    letterSpacing: '-0.02em'
                  }}
                >
                  Solin
                </span>
              </Link>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-3 mr-12 hover:opacity-80 transition-opacity cursor-pointer relative z-20 pointer-events-auto group"
                style={{ pointerEvents: 'auto' }}
              >
                <Infinity 
                  className="w-8 h-8 transition-transform group-hover:scale-110" 
                  style={{ 
                    color: 'hsl(var(--primary))',
                    strokeWidth: 2.5
                  }} 
                />
                <span 
                  className="text-2xl font-bold tracking-tight leading-none"
                  style={{ 
                    color: 'hsl(var(--primary))',
                    letterSpacing: '-0.02em'
                  }}
                >
                  Solin
                </span>
              </button>
            )}
            
            {/* 
              NAVIGATION ITEMS - Equally Spaced (Center-Right)
              UBS-style clean navigation with equal spacing
            */}
            <div className="flex items-center flex-1 justify-end gap-1 relative z-10">
              {navItems.map(({ path, icon: Icon, label }) => (
                <Link 
                  key={path} 
                  to={path} 
                  className="relative z-10 pointer-events-auto cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "font-manrope flex items-center gap-1.5 transition-colors duration-200 text-sm px-4 py-2 h-10 pointer-events-auto cursor-pointer hover:bg-accent/10",
                      isActive(path) 
                        ? "text-primary font-semibold" 
                        : "text-foreground/80 hover:text-foreground font-medium"
                    )}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <span>{label}</span>
                  </Button>
                </Link>
              ))}
              
              {/* Sign Out Button */}
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="font-manrope font-medium flex items-center gap-1.5 transition-colors duration-200 text-sm px-4 py-2 h-10 text-foreground/80 hover:text-destructive hover:bg-destructive/10 pointer-events-auto cursor-pointer ml-2"
                  style={{ pointerEvents: 'auto' }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 
        MOBILE NAVIGATION BAR
      */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border sm:hidden z-40">
        <div className="flex items-center py-2 px-2 overflow-x-auto gap-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link key={path} to={path} className="flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex flex-col items-center gap-0.5 h-auto py-1.5 px-2 min-w-0 font-light",
                  isActive(path) 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span className="text-[10px] leading-tight text-center">
                  {label.length > 8 ? label.split(' ')[0] : label}
                </span>
              </Button>
            </Link>
          ))}
          
          {/* Mobile Sign Out Button */}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2 min-w-0 font-light text-destructive hover:text-destructive flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-[10px] leading-tight text-center">
                Sign Out
              </span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Desktop Navigation Spacer */}
      <div className="hidden sm:block h-16"></div>
      
      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};

export default Navigation;