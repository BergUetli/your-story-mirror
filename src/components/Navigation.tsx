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
import { Clock, Info, HelpCircle, Plus, Sparkles, Users, Shield, BookOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

/**
 * MAIN NAVIGATION COMPONENT
 * 
 * Manages the entire navigation experience across the application, providing
 * access to information pages, core features, and user management tools.
 */
const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  /**
   * INFORMATION NAVIGATION ITEMS
   * 
   * BUSINESS PURPOSE: These items help users understand the platform and learn
   * how to use it effectively. They're positioned on the left for logical
   * information-seeking behavior.
   */
  const leftNavItems = [
    ...(user ? [{ path: '/admin', icon: Shield, label: 'Admin' }] : []),
    { path: '/about', icon: Info, label: 'About' },
    { path: '/how-it-works', icon: HelpCircle, label: 'How It Works' },
  ];

  /**
   * CORE FEATURE NAVIGATION ITEMS
   * 
   * BUSINESS PURPOSE: These are the main functional areas where users spend
   * their time creating and managing their digital legacy. They're positioned
   * on the right as the primary action center.
   * 
   * FEATURE DESCRIPTIONS:
   * - Timeline: Chronological view of all memories
   * - Reconstruction: AI-powered memory enhancement and story generation
   * - Identities: User profile and family member management
   * 
   * NOTE: Add Memory is hidden - users can add memories through Solin agent's manual form option
   */
  const rightNavItems = user ? [
    { path: '/timeline', icon: Clock, label: 'Timeline' },
    { path: '/story', icon: BookOpen, label: 'Story' },
    { path: '/reconstruction', icon: Sparkles, label: 'Reconstruction' },
    { path: '/identities', icon: Users, label: 'Identities' },
  ] : [];

  /**
   * ACTIVE PAGE DETECTION
   * 
   * BUSINESS PURPOSE: Provides visual feedback to users about their current
   * location within the application, reducing confusion and improving navigation.
   */
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* 
        DESKTOP/TABLET NAVIGATION BAR
        BUSINESS PURPOSE: Primary navigation interface for desktop and tablet users, providing
        full access to all features with responsive design that adapts to screen sizes.
        
        RESPONSIVE DESIGN FEATURES:
        - Fixed top positioning for consistent access
        - Semi-transparent background with backdrop blur for modern aesthetic
        - Flexible layout that adapts from large screens to tablets
        - Smart spacing and overflow handling for iPad and smaller tablets
        - Active state highlighting with bottom border for clear orientation
        - Hover animations for interactive feedback
      */}
      <div className="hidden sm:block fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b-[1.5px] z-40" style={{ borderColor: 'hsl(var(--section-border))' }}>
        <div className="max-w-7xl mx-auto px-3 lg:px-6 relative">
          <div className="flex items-center justify-between h-12 gap-2">
            {/* 
              INFORMATION SECTION (Left Side)
              BUSINESS PURPOSE: Provides access to educational content and help resources.
              Users can learn about the platform before engaging with core features.
              RESPONSIVE: Compact spacing and text on smaller tablets
            */}
            <div className="flex items-center gap-1 lg:gap-3 flex-shrink-0">
              {leftNavItems.map(({ path, icon: Icon, label }) => (
                <Link key={path} to={path}>
                  <Button
                    variant={isActive(path) ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      "font-medium lg:font-semibold flex items-center gap-1 lg:gap-2 transition-all duration-200 hover:scale-105 text-xs lg:text-sm px-2 lg:px-3",
                      isActive(path) && "border-b-2 rounded-b-none"
                    )}
                    style={isActive(path) ? { borderColor: 'hsl(var(--section-border))' } : {}}
                  >
                    <Icon className="w-3 h-3 lg:w-4 lg:h-4" />
                    <span className="hidden lg:inline">{label}</span>
                    <span className="lg:hidden">{label.split(' ')[0]}</span>
                  </Button>
                </Link>
              ))}
            </div>

            {/* 
              BRAND SECTION (Center) - Flexible positioning for responsive design
              BUSINESS PURPOSE: Provides brand recognition and quick access to home page.
              Acts as a visual anchor and primary logo placement.
              RESPONSIVE: Adjusts size and positioning based on screen size
            */}
            <Link 
              to="/" 
              className="flex-shrink-0 text-lg lg:text-2xl font-bold tracking-wide hover:text-primary transition-colors mx-2 lg:mx-4"
            >
              <span className="hidden lg:inline">Solin One</span>
              <span className="lg:hidden">Solin</span>
            </Link>
            
            {/* 
              CORE FEATURES SECTION (Right Side)
              BUSINESS PURPOSE: Primary action center where users access main functionality.
              This is where users spend most of their time creating and managing memories.
              
              FEATURES INCLUDED:
              - Home/Sanctuary: Dashboard and overview
              - Add Memory: Primary content creation
              - Timeline: Memory organization and viewing
              - Reconstruction: AI enhancement tools
              - Identities: User and family management
            */}
            {/* 
              CORE FEATURES SECTION (Right Side)
              BUSINESS PURPOSE: Primary action center where users access main functionality.
              This is where users spend most of their time creating and managing memories.
              
              RESPONSIVE FEATURES:
              - Compact spacing on tablets and smaller screens
              - Icon-only mode on very tight spaces
              - Flexible gap and text sizing
              - Overflow handling with scroll on extreme cases
            */}
            {user && (
              <div className="flex items-center gap-1 lg:gap-3 flex-shrink-0 overflow-x-auto max-w-[50%] lg:max-w-none">
                {rightNavItems.map(({ path, icon: Icon, label }) => (
                  <Link key={path} to={path} className="flex-shrink-0">
                    <Button
                      variant={isActive(path) ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        "font-medium lg:font-semibold flex items-center gap-1 lg:gap-2 transition-all duration-200 hover:scale-105 text-xs lg:text-sm px-2 lg:px-3",
                        isActive(path) && "border-b-2 rounded-b-none"
                      )}
                      style={isActive(path) ? { borderColor: 'hsl(var(--section-border))' } : {}}
                    >
                      <Icon className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span className="hidden xl:inline">{label}</span>
                      <span className="xl:hidden hidden lg:inline">{label.length > 8 ? label.split(' ')[0] : label}</span>
                      <span className="lg:hidden sr-only">{label}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 
        MOBILE NAVIGATION BAR
        BUSINESS PURPOSE: Optimized navigation for mobile devices, providing thumb-friendly
        access to all features at the bottom of the screen for easy one-handed use.
        
        MOBILE UX CONSIDERATIONS:
        - Bottom positioning for natural thumb reach
        - Icon-first layout for space efficiency
        - Horizontal scroll for overflow handling
        - Active state highlighting for current page awareness
        - Combined information and feature items for simplified mobile experience
        - Responsive text sizing based on number of items
      */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border sm:hidden z-40">
        <div className="flex items-center py-2 px-2 overflow-x-auto gap-1 mobile-nav-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {[...leftNavItems, ...rightNavItems].map(({ path, icon: Icon, label }) => (
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
                <span className={cn(
                  "text-xs leading-tight text-center",
                  [...leftNavItems, ...rightNavItems].length > 6 ? "text-[10px]" : "text-xs"
                )}>
                  {label.length > 8 ? label.split(' ')[0] : label}
                </span>
              </Button>
            </Link>
          ))}
        </div>
      </div>
      
      {/* 
        DESKTOP NAVIGATION SPACER
        BUSINESS PURPOSE: Provides top margin to prevent content from being hidden
        behind the fixed desktop navigation bar. This ensures all page content is
        visible and properly positioned below the navigation.
      */}
      <div className="hidden sm:block h-12"></div>
    </>
  );
};

export default Navigation;