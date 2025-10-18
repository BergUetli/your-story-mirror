/**
 * SIDEBAR NAVIGATION COMPONENT
 * 
 * Left-hand collapsible navigation sidebar with organized sections:
 * - Top section: Main app features (Solin, Timeline, etc.) - for authenticated users
 * - Bottom section: Information/system pages (Admin, About, Home)
 */

import { Button } from '@/components/ui/button';
import { Clock, Info, HelpCircle, Sparkles, Users, Shield, BookOpen, LogOut, Home, Menu, ChevronLeft, X } from 'lucide-react';
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
    { path: '/sanctuary', icon: Sparkles, label: 'Solin', description: 'AI Memory Assistant' },
    { path: '/timeline', icon: Clock, label: 'Timeline', description: 'Chronological View' },
    { path: '/story', icon: BookOpen, label: 'Story', description: 'Life Narrative' },
    { path: '/reconstruction', icon: Sparkles, label: 'Reconstruction', description: 'AI Enhancement' },
    { path: '/identities', icon: Users, label: 'Identities', description: 'Family & People' },
  ] : [];

  /**
   * BOTTOM SECTION: Information/System Pages
   */
  const systemNavItems = [
    ...(user ? [{ path: '/admin', icon: Shield, label: 'Admin', description: 'System Controls' }] : []),
    { path: '/about', icon: Info, label: 'About', description: 'Learn More' },
    { path: '/how-it-works', icon: HelpCircle, label: 'How It Works', description: 'User Guide' },
    { path: '/', icon: Home, label: 'Home', description: 'Landing Page' },
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
      <Button
        variant={isActive(item.path) ? 'default' : 'ghost'}
        className={cn(
          "w-full justify-start gap-3 h-12 transition-all duration-200",
          isExpanded ? "px-4" : "px-3 justify-center",
          isActive(item.path) 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "hover:bg-muted/50"
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {isExpanded && (
          <div className="flex flex-col items-start overflow-hidden">
            <span className="font-medium text-sm leading-none">{item.label}</span>
            <span className="text-xs opacity-70 leading-none mt-0.5">{item.description}</span>
          </div>
        )}
      </Button>
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
          "fixed left-0 top-0 h-full bg-background border-r border-border z-40 transition-all duration-300 flex flex-col",
          isExpanded ? "w-64" : "w-16",
          // On mobile, hide completely when collapsed, show as overlay when expanded
          "md:translate-x-0",
          isExpanded ? "translate-x-0" : "md:translate-x-0 -translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center gap-2">
              {user ? (
                <Link to="/sanctuary" className="text-xl font-bold hover:text-primary transition-colors">
                  Solin One
                </Link>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-xl font-bold hover:text-primary transition-colors"
                >
                  Solin One
                </button>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Main Navigation Section */}
        {mainNavItems.length > 0 && (
          <div className="flex-1 p-2 overflow-y-auto">
            <div className="space-y-1">
              {isExpanded && (
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Main
                </div>
              )}
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
        <div className="p-2 border-t border-border">
          <div className="space-y-1">
            {isExpanded && (
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                System
              </div>
            )}
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
              <Button
                variant="ghost"
                onClick={() => {
                  handleSignOut();
                  if (window.innerWidth < 768) {
                    setIsExpanded(false);
                  }
                }}
                className={cn(
                  "w-full justify-start gap-3 h-12 transition-all duration-200 text-destructive hover:bg-destructive/10",
                  isExpanded ? "px-4" : "px-3 justify-center"
                )}
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                {isExpanded && (
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="font-medium text-sm leading-none">Sign Out</span>
                    <span className="text-xs opacity-70 leading-none mt-0.5">End Session</span>
                  </div>
                )}
              </Button>
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