import { Button } from '@/components/ui/button';
import { Home, Clock, Info, HelpCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/add-memory', label: 'Add Memory' },
    { path: '/timeline', icon: Clock, label: 'Timeline' },
    { path: '/about', icon: Info, label: 'About' },
    { path: '/how-it-works', icon: HelpCircle, label: 'How It Works' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:block fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-border z-40">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <Link to="/" className="text-xl font-light tracking-wide hover:text-primary transition-colors">
              You, Remembered
            </Link>
            
            {/* Desktop Nav Items */}
            <div className="flex items-center gap-2">
              {navItems.slice(1).map(({ path, label }) => (
                <Link key={path} to={path}>
                  <Button
                    variant={isActive(path) ? 'default' : 'ghost'}
                    size="sm"
                    className="font-light"
                  >
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
          {navItems.map(({ path, icon: Icon, label }) => (
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
      <div className="hidden md:block h-14"></div>
    </>
  );
};

export default Navigation;