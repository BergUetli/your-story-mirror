import { Button } from '@/components/ui/button';
import { Heart, Home, Plus, Clock, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/add-memory', icon: Plus, label: 'Add Memory' },
    { path: '/timeline', icon: Clock, label: 'Timeline' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-sanctuary/95 backdrop-blur-sm border-t border-muted md:hidden">
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
  );
};

export default Navigation;