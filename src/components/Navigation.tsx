import { Button } from '@/components/ui/button';
import { Heart, Home, Plus, Clock, Settings, BookOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/components/UserProfile';

const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/journal', icon: BookOpen, label: 'Journal' },
    { path: '/add-memory', icon: Plus, label: 'Add Memory' },
    { path: '/timeline', icon: Clock, label: 'Timeline' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:block fixed top-0 left-0 right-0 bg-sanctuary/95 backdrop-blur-sm border-b border-muted z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-memory to-accent flex items-center justify-center">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-memory to-accent bg-clip-text text-transparent">
                You, Remembered
              </span>
            </Link>
            
            {/* Desktop Nav Items */}
            <div className="flex items-center space-x-8">
              {navItems.map(({ path, icon: Icon, label }) => (
                <Link key={path} to={path}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center space-x-2",
                      isActive(path) 
                        ? "text-memory bg-memory/10" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Button>
                </Link>
              ))}
            </div>
            
            {/* User Profile */}
            <UserProfile />
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-sanctuary/95 backdrop-blur-sm border-t border-muted md:hidden z-40">
        <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link key={path} to={path}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0",
                  isActive(path) 
                    ? "text-memory bg-memory/10" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Spacer for desktop navigation */}
      <div className="hidden md:block h-16"></div>
    </>
  );
};

export default Navigation;