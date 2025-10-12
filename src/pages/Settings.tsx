import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Shield, Heart, User, Mic, Mail, Download, Trash2 } from 'lucide-react';
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
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-16 space-y-12 animate-fade-in">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Settings
          </h1>
          <p className="text-xl text-muted-foreground">
            Customize your experience and manage your privacy.
          </p>
        </div>

        {/* Profile Settings */}
        <Card className="modern-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="userName">Display name</Label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="bg-card border-border"
                placeholder="What should we call you?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-card border-border"
                placeholder="your@email.com"
              />
              <p className="text-xs text-muted-foreground">
                Used for authentication and important updates
              </p>
            </div>

            <Button 
              onClick={handleSaveProfile}
              className="bg-primary hover:bg-primary/90 rounded-full"
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Privacy & Notifications */}
        <Card className="modern-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              Privacy & Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-card/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Email notifications</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive reminders and memory insights
                </p>
              </div>
              <Switch 
                checked={notifications} 
                onCheckedChange={setNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-card/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Voice synthesis</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enable voice cloning (coming soon)
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
        <Card className="modern-card border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold">Our Promise to You</h3>
                <div className="text-sm text-muted-foreground space-y-2">
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
        <Card className="modern-card border-border/50">
          <CardHeader>
            <CardTitle>Data & Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start border-border hover:bg-card rounded-full">
              <Download className="w-4 h-4 mr-2" />
              Export my memories
            </Button>
            
            <Button variant="outline" className="w-full justify-start border-border hover:bg-card rounded-full">
              <Download className="w-4 h-4 mr-2" />
              Download my data
            </Button>

            <div className="pt-4 border-t border-border">
              <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full">
                <Trash2 className="w-4 h-4 mr-2" />
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
