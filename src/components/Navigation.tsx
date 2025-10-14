import { Button } from '@/components/ui/button';
import { Home, Clock, Info, HelpCircle, Plus, Sparkles, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Navigation = () => {
  const location = useLocation();
  
  
  const leftNavItems = [
    { path: '/how-it-works', icon: HelpCircle, label: 'How It Works' },
  ];

  const rightNavItems = [
    { path: '/sanctuary', icon: Home, label: 'Home' },
    { path: '/add-memory', icon: Plus, label: 'Add Memory' },
    { path: '/timeline', icon: Clock, label: 'Timeline' },
    { path: '/reconstruction', icon: Sparkles, label: 'Reconstruction' },
    { path: '/identities', icon: Users, label: 'Identities' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:block fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b-[1.5px] z-40" style={{ borderColor: 'hsl(var(--section-border))' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-12">
            {/* Left - Info Pages */}
            <div className="flex items-center gap-2">
              {leftNavItems.map(({ path, label }) => (
                <Link key={path} to={path}>
                  <Button
                    variant={isActive(path) ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      "font-semibold transition-all duration-200 hover:scale-105",
                      isActive(path) && "border-b-2 rounded-b-none"
                    )}
                    style={isActive(path) ? { borderColor: 'hsl(var(--section-border))' } : {}}
                  >
                    {label}
                  </Button>
                </Link>
              ))}
            </div>

            {/* Center - Logo */}
            <Link to="/" className="text-xl font-light tracking-wide hover:text-primary transition-colors">
              Solin One
            </Link>
            
            {/* Right - Control Panel */}
            <div className="flex items-center gap-2">
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
      
      {/* Mobile Navigation */}
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
      
      {/* Spacer for desktop navigation */}
      <div className="hidden md:block h-12"></div>
    </>
  );
};

export default Navigation;