import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Shield, Heart, User, Mic, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const [userName, setUserName] = useState('Sarah');
  const [email, setEmail] = useState('sarah@example.com');
  const [notifications, setNotifications] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleSaveProfile = async () => {
    setIsUpdating(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem('userName', userName);
      
      toast({
        title: "Profile updated",
        description: "Your preferences have been saved safely"
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Please try again in a moment",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-sanctuary p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 pt-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to sanctuary
            </Button>
          </Link>
        </div>

        <div className="text-center space-y-4">
          <User className="w-10 h-10 mx-auto text-accent gentle-float" />
          <h1 className="text-3xl md:text-4xl font-light text-foreground">
            Your Sanctuary Settings
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Customize your experience and manage your privacy preferences.
          </p>
        </div>

        {/* Profile Settings */}
        <Card className="memory-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <User className="w-5 h-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userName" className="text-foreground">Display name</Label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="bg-sanctuary border-muted focus:border-memory transition-colors"
                placeholder="What should we call you?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-sanctuary border-muted focus:border-memory transition-colors"
                placeholder="your@email.com"
              />
              <p className="text-xs text-muted-foreground">
                Used for authentication and important updates
              </p>
            </div>

            <Button 
              onClick={handleSaveProfile}
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                'Save Profile'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Privacy & Notifications */}
        <Card className="memory-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Shield className="w-5 h-5" />
              Privacy & Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">Email notifications</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive gentle reminders and memory insights
                </p>
              </div>
              <Switch 
                checked={notifications} 
                onCheckedChange={setNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">Voice synthesis</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enable voice cloning for audio messages (coming soon)
                </p>
              </div>
              <Switch 
                checked={voiceEnabled} 
                onCheckedChange={setVoiceEnabled}
                disabled
              />
            </div>

          </CardContent>
        </Card>

        {/* Privacy Promise */}
        <Card className="bg-love/10 border-love/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Heart className="w-6 h-6 text-love flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-medium text-love-foreground">Our Promise to You</h3>
                <div className="text-sm text-love-foreground/80 space-y-1">
                  <p>• Your memories are private and encrypted</p>
                  <p>• We never use your data for AI training</p>
                  <p>• You own your stories, always</p>
                  <p>• No data is shared without your explicit consent</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="memory-card">
          <CardContent className="p-6 space-y-4">
            <Button variant="outline" className="w-full border-muted text-muted-foreground hover:text-foreground">
              Export my memories
            </Button>
            
            <Button variant="outline" className="w-full border-muted text-muted-foreground hover:text-foreground">
              Download my data
            </Button>

            <div className="pt-4 border-t border-muted">
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                Delete my account
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                This action cannot be undone
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Settings;