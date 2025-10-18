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

/**
 * MAIN NAVIGATION COMPONENT
 * 
 * Manages the entire navigation experience across the application, providing
 * access to information pages, core features, and user management tools.
 */
const Navigation = () => {
  const location = useLocation();
  
  /**
   * INFORMATION NAVIGATION ITEMS
   * 
   * BUSINESS PURPOSE: These items help users understand the platform and learn
   * how to use it effectively. They're positioned on the left for logical
   * information-seeking behavior.
   */
  const leftNavItems = [
    { path: '/admin', icon: Shield, label: 'Admin' },
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
  const rightNavItems = [
    { path: '/timeline', icon: Clock, label: 'Timeline' },
    { path: '/story', icon: BookOpen, label: 'Story' },
    { path: '/reconstruction', icon: Sparkles, label: 'Reconstruction' },
    { path: '/identities', icon: Users, label: 'Identities' },
  ];

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
        DESKTOP NAVIGATION BAR
        BUSINESS PURPOSE: Primary navigation interface for desktop users, providing
        full access to all features with clear visual hierarchy and professional styling.
        
        DESIGN FEATURES:
        - Fixed top positioning for consistent access
        - Semi-transparent background with backdrop blur for modern aesthetic
        - Three-section layout: Information (left), Brand (center), Actions (right)
        - Active state highlighting with bottom border for clear orientation
        - Hover animations for interactive feedback
      */}
      <div className="hidden md:block fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b-[1.5px] z-40" style={{ borderColor: 'hsl(var(--section-border))' }}>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="flex justify-between items-center h-12">
            {/* 
              INFORMATION SECTION (Left Side)
              BUSINESS PURPOSE: Provides access to educational content and help resources.
              Users can learn about the platform before engaging with core features.
            */}
            <div className="flex items-center gap-3">
              {leftNavItems.map(({ path, icon: Icon, label }) => (
                <Link key={path} to={path}>
                  <Button
                    variant={isActive(path) ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      "font-semibold flex items-center gap-2 transition-all duration-200 hover:scale-105",
                      isActive(path) && "border-b-2 rounded-b-none"
                    )}
                    style={isActive(path) ? { borderColor: 'hsl(var(--section-border))' } : {}}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                </Link>
              ))}
            </div>

            {/* 
              BRAND SECTION (Center) - Absolutely positioned for true centering
              BUSINESS PURPOSE: Provides brand recognition and quick access to home page.
              Acts as a visual anchor and primary logo placement.
            */}
            <Link 
              to="/" 
              className="absolute left-1/2 transform -translate-x-1/2 text-2xl font-bold tracking-wide hover:text-primary transition-colors z-10"
            >
              Solin One
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
            <div className="flex items-center gap-3 ml-16">
              {rightNavItems.map(({ path, icon: Icon, label }) => (
                <Link key={path} to={path}>
                  <Button
                    variant={isActive(path) ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      "font-semibold flex items-center gap-2 transition-all duration-200 hover:scale-105",
                      isActive(path) && "border-b-2 rounded-b-none"
                    )}
                    style={isActive(path) ? { borderColor: 'hsl(var(--section-border))' } : {}}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* 
        MOBILE NAVIGATION BAR
        BUSINESS PURPOSE: Optimized navigation for mobile devices, providing thumb-friendly
        access to all features at the bottom of the screen for easy one-handed use.
        
        MOBILE UX CONSIDERATIONS:
        - Bottom positioning for natural thumb reach
        - Icon + text layout for clear feature identification
        - Compact spacing to fit all navigation items
        - Active state highlighting for current page awareness
        - Combined information and feature items for simplified mobile experience
      */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border md:hidden z-40">
        <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
          {[...leftNavItems, ...rightNavItems].map(({ path, icon: Icon, label }) => (
            <Link key={path} to={path}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0 font-light",
                  isActive(path) 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {Icon && <Icon className="w-5 h-5" />}
                <span className="text-xs">{label}</span>
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
      <div className="hidden md:block h-12"></div>
    </>
  );
};

export default Navigation;