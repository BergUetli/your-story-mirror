/**
 * SIDEBAR NAVIGATION COMPONENT
 * 
 * Modern, polished left-hand collapsible navigation sidebar:
 * - Top section: Main app features (Solin, Timeline, etc.) - for authenticated users
 * - Bottom section: Information/system pages (Admin, About, Home)
 * - Clean, modern design without divider lines
 */

import { Button } from '@/components/ui/button';
import { Clock, Info, HelpCircle, Sparkles, Users, Shield, BookOpen, LogOut, Home, Menu, ChevronLeft, Hexagon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';

const SidebarNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  /**
   * TOP SECTION: Main App Features (only for authenticated users)
   */
  const mainNavItems = user ? [
    { path: '/sanctuary', icon: Sparkles, label: 'Solin', description: 'AI Memory Assistant', accent: 'from-purple-500/20 to-pink-500/20' },
    { path: '/particle-face', icon: Hexagon, label: 'Face', description: 'Particle Avatar', accent: 'from-cyan-500/20 to-blue-500/20' },
    { path: '/timeline', icon: Clock, label: 'Timeline', description: 'Life Journey', accent: 'from-blue-500/20 to-cyan-500/20' },
    { path: '/story', icon: BookOpen, label: 'Story', description: 'Your Narrative', accent: 'from-green-500/20 to-emerald-500/20' },
    { path: '/reconstruction', icon: Sparkles, label: 'Reconstruction', description: 'AI Enhancement', accent: 'from-orange-500/20 to-amber-500/20' },
    { path: '/identities', icon: Users, label: 'Identities', description: 'People & Family', accent: 'from-rose-500/20 to-pink-500/20' },
  ] : [];

  /**
   * BOTTOM SECTION: Information/System Pages
   */
  const systemNavItems = [
    ...(user ? [{ path: '/admin', icon: Shield, label: 'Admin', description: 'System Controls', accent: 'from-red-500/20 to-orange-500/20' }] : []),
    { path: '/about', icon: Info, label: 'About', description: 'Learn More', accent: 'from-slate-500/20 to-gray-500/20' },
    { path: '/how-it-works', icon: HelpCircle, label: 'How It Works', description: 'User Guide', accent: 'from-indigo-500/20 to-purple-500/20' },
    { path: '/', icon: Home, label: 'Home', description: 'Landing Page', accent: 'from-teal-500/20 to-cyan-500/20' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const NavItem = ({ item, onClick }: { item: any; onClick?: () => void }) => (
    <Link key={item.path} to={item.path} onClick={onClick}>
      <div
        className={cn(
          "group relative w-full rounded-xl transition-all duration-300 ease-out",
          isActive(item.path) 
            ? "bg-gradient-to-r" + " " + item.accent + " shadow-lg shadow-black/5 scale-[1.02]" 
            : "hover:bg-gradient-to-r hover:" + item.accent + " hover:scale-[1.01] hover:shadow-md hover:shadow-black/5"
        )}
      >
        {/* Active indicator */}
        {isActive(item.path) && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
        )}
        
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
            isExpanded ? "justify-start" : "justify-center",
            isActive(item.path) 
              ? "text-foreground" 
              : "text-muted-foreground group-hover:text-foreground"
          )}
        >
          <item.icon className={cn(
            "flex-shrink-0 transition-all duration-200",
            isExpanded ? "w-5 h-5" : "w-6 h-6",
            isActive(item.path) ? "text-primary" : "group-hover:text-primary"
          )} />
          
          {isExpanded && (
            <div className="flex flex-col items-start overflow-hidden flex-1 min-w-0">
              <span className="font-semibold text-sm leading-tight truncate w-full">{item.label}</span>
              <span className="text-xs opacity-60 leading-tight mt-0.5 truncate w-full">{item.description}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );

  return (
    <>
      {/* Mobile Menu Toggle - only show on mobile */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full bg-gradient-to-b from-white to-gray-50/50 backdrop-blur-xl border-r border-border/30 z-40 transition-all duration-300 flex flex-col shadow-xl shadow-black/5",
          isExpanded ? "w-72" : "w-18",
          // On mobile, hide completely when collapsed, show as overlay when expanded
          "md:translate-x-0",
          isExpanded ? "translate-x-0" : "md:translate-x-0 -translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-6 pb-8 flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              {user ? (
                <Link to="/sanctuary" className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent hover:from-primary hover:to-primary/70 transition-all duration-300">
                  Solin One
                </Link>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent hover:from-primary hover:to-primary/70 transition-all duration-300"
                >
                  Solin One
                </button>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 rounded-xl hover:bg-white/50 transition-all duration-200"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Main Navigation Section */}
        {mainNavItems.length > 0 && (
          <div className="flex-1 px-4 overflow-y-auto">
            <div className="space-y-2">
              {mainNavItems.map((item) => (
                <NavItem key={item.path} item={item} onClick={() => {
                  // Close mobile menu after navigation
                  if (window.innerWidth < 768) {
                    setIsExpanded(false);
                  }
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Bottom System Navigation Section */}
        <div className="px-4 pb-6 pt-4">
          {/* Visual spacer without divider line */}
          <div className="mb-6"></div>
          
          <div className="space-y-2">
            {systemNavItems.map((item) => (
              <NavItem key={item.path} item={item} onClick={() => {
                // Close mobile menu after navigation
                if (window.innerWidth < 768) {
                  setIsExpanded(false);
                }
              }} />
            ))}
            
            {/* Sign Out Button */}
            {user && (
              <div
                className="group relative w-full rounded-xl transition-all duration-300 ease-out hover:bg-gradient-to-r hover:from-red-500/20 hover:to-orange-500/20 hover:scale-[1.01] hover:shadow-md hover:shadow-black/5 mt-4"
              >
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-destructive group-hover:text-destructive",
                    isExpanded ? "justify-start" : "justify-center"
                  )}
                  onClick={() => {
                    handleSignOut();
                    if (window.innerWidth < 768) {
                      setIsExpanded(false);
                    }
                  }}
                >
                  <LogOut className={cn(
                    "flex-shrink-0 transition-all duration-200",
                    isExpanded ? "w-5 h-5" : "w-6 h-6"
                  )} />
                  
                  {isExpanded && (
                    <div className="flex flex-col items-start overflow-hidden flex-1 min-w-0">
                      <span className="font-semibold text-sm leading-tight truncate w-full">Sign Out</span>
                      <span className="text-xs opacity-60 leading-tight mt-0.5 truncate w-full">End Session</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};

export default SidebarNavigation;