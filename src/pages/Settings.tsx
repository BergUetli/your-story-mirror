import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Shield, Heart, User, Mic, Mail, Download, Trash2, Wallet, TrendingUp, Image, Brain, MessageSquare, Volume2, Sparkles, MapPin, Briefcase, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Profile state
  const [preferredName, setPreferredName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [hometown, setHometown] = useState('');
  const [location, setLocation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState('');
  const [educationBackground, setEducationBackground] = useState('');
  const [hobbiesInterests, setHobbiesInterests] = useState('');
  const [topicsOfInterest, setTopicsOfInterest] = useState('');
  
  // UI state
  const [notifications, setNotifications] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  // Load profile data
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfileExists(true);
        setPreferredName(data.preferred_name || '');
        setAge(data.age || '');
        setHometown(data.hometown || '');
        setLocation(data.location || '');
        setOccupation(data.occupation || '');
        setRelationshipStatus(data.relationship_status || '');
        setEducationBackground(data.education_background || '');
        setHobbiesInterests(data.hobbies_interests?.join(', ') || '');
        setTopicsOfInterest(data.topics_of_interest?.join(', ') || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error loading profile",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsUpdating(true);
    
    try {
      const profileData = {
        user_id: user.id,
        preferred_name: preferredName || null,
        age: age ? Number(age) : null,
        hometown: hometown || null,
        location: location || null,
        occupation: occupation || null,
        relationship_status: relationshipStatus || null,
        education_background: educationBackground || null,
        hobbies_interests: hobbiesInterests ? hobbiesInterests.split(',').map(s => s.trim()).filter(Boolean) : null,
        topics_of_interest: topicsOfInterest ? topicsOfInterest.split(',').map(s => s.trim()).filter(Boolean) : null,
      };

      if (profileExists) {
        // Update existing profile
        const { error } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('user_profiles')
          .insert(profileData);

        if (error) throw error;
        setProfileExists(true);
      }
      
      toast({
        title: "Profile updated",
        description: "Your information has been saved successfully"
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Update failed",
        description: "Please try again in a moment",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your settings...</p>
        </div>
      </div>
    );
  }

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
              Profile Details
            </CardTitle>
            <CardDescription>
              Your key information used throughout the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferredName">Preferred Name</Label>
                <Input
                  id="preferredName"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  className="bg-card border-border"
                  placeholder="What should we call you?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                  className="bg-card border-border"
                  placeholder="Your age"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hometown" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Hometown
                </Label>
                <Input
                  id="hometown"
                  value={hometown}
                  onChange={(e) => setHometown(e.target.value)}
                  className="bg-card border-border"
                  placeholder="Where you grew up"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Current Location
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-card border-border"
                  placeholder="Where you live now"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Occupation
                </Label>
                <Input
                  id="occupation"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="bg-card border-border"
                  placeholder="What you do"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationshipStatus">Relationship Status</Label>
                <Input
                  id="relationshipStatus"
                  value={relationshipStatus}
                  onChange={(e) => setRelationshipStatus(e.target.value)}
                  className="bg-card border-border"
                  placeholder="e.g., Single, Married, Partner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="educationBackground" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Education Background
              </Label>
              <Textarea
                id="educationBackground"
                value={educationBackground}
                onChange={(e) => setEducationBackground(e.target.value)}
                className="bg-card border-border min-h-[80px]"
                placeholder="Your educational background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hobbiesInterests">Hobbies & Interests</Label>
              <Textarea
                id="hobbiesInterests"
                value={hobbiesInterests}
                onChange={(e) => setHobbiesInterests(e.target.value)}
                className="bg-card border-border min-h-[80px]"
                placeholder="Separate with commas: e.g., photography, hiking, reading"
              />
              <p className="text-xs text-muted-foreground">Separate multiple items with commas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topicsOfInterest">Topics of Interest</Label>
              <Textarea
                id="topicsOfInterest"
                value={topicsOfInterest}
                onChange={(e) => setTopicsOfInterest(e.target.value)}
                className="bg-card border-border min-h-[80px]"
                placeholder="Separate with commas: e.g., technology, philosophy, travel"
              />
              <p className="text-xs text-muted-foreground">Separate multiple topics with commas</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <h4 className="font-medium text-sm">Account Status</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Member since</p>
                  <p className="font-medium">October 2025</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total memories</p>
                  <p className="font-medium">0 stored</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trained identities</p>
                  <p className="font-medium">0 active</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <Badge variant="secondary">Free</Badge>
                </div>
              </div>
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

        {/* Usage & Costs */}
        <Card className="modern-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              Usage & Costs
            </CardTitle>
            <CardDescription>
              Track ongoing operational costs for voice services and identity training
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Month Summary */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">Current Month</span>
                <Badge variant="secondary">October 2025</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">CHF 0.00</span>
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Total external service costs</p>
              </div>
            </div>

            {/* Usage Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Usage Breakdown</h4>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                <div className="flex items-center gap-3">
                  <Mic className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Solin Voice Conversations</p>
                    <p className="text-xs text-muted-foreground">0 minutes this month</p>
                  </div>
                </div>
                <span className="font-medium">CHF 0.00</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Text-to-Speech</p>
                    <p className="text-xs text-muted-foreground">0 characters this month</p>
                  </div>
                </div>
                <span className="font-medium">CHF 0.00</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                <div className="flex items-center gap-3">
                  <Brain className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Identity Training</p>
                    <p className="text-xs text-muted-foreground">0 identities trained</p>
                  </div>
                </div>
                <span className="font-medium">CHF 0.00</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                <div className="flex items-center gap-3">
                  <Image className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Photoreal Image Generations</p>
                    <p className="text-xs text-muted-foreground">0 images generated</p>
                  </div>
                </div>
                <span className="font-medium">CHF 0.00</span>
              </div>
            </div>

            {/* Cost Explanation */}
            <div className="p-4 rounded-lg bg-muted/30 space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Ongoing Service Costs
              </h4>
              <div className="text-sm text-muted-foreground space-y-3">
                <div>
                  <p className="font-medium text-foreground mb-2">ElevenLabs (Voice Services):</p>
                  <ul className="space-y-1 pl-4">
                    <li>• <strong>Conversational AI (Solin):</strong> ~CHF 0.90 per minute</li>
                    <li>• <strong>Text-to-Speech:</strong> ~CHF 2.70 per 100,000 characters</li>
                    <li className="text-xs italic">First 10 minutes/month free for conversations</li>
                    <li className="text-xs italic">First 10,000 characters/month free for TTS</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-2">Replicate AI (Identity & Images):</p>
                  <ul className="space-y-1 pl-4">
                    <li>• <strong>Identity Training:</strong> ~CHF 1.80-3.60 per identity</li>
                    <li>• <strong>Photoreal Generation:</strong> ~CHF 0.05-0.09 per image</li>
                    <li className="text-xs italic">First CHF 9.00/month free credit</li>
                  </ul>
                </div>

                <p className="text-xs italic pt-3 border-t border-border">
                  💡 Exchange rate: 1 USD ≈ 0.90 CHF. Prices are estimates based on current service pricing.
                </p>
                <p className="text-xs font-medium">
                  📊 These are pay-as-you-go costs charged by external AI services (ElevenLabs, Replicate).
                </p>
                <p className="text-xs text-muted-foreground">
                  Note: AI chat, memory processing, and sketches are included in the platform at no additional cost.
                </p>
              </div>
            </div>

            {/* API Key Management */}
            <div className="p-4 rounded-lg border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">Replicate API Key</h4>
                  <p className="text-xs text-muted-foreground">Required for identity training & photoreal images</p>
                </div>
                <Badge variant="outline" className="text-orange-500 border-orange-500">Not Connected</Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full" disabled>
                Connect Replicate Account
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Coming soon - Replicate integration in development
              </p>
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
