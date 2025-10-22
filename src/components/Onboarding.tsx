import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Heart, ArrowRight, Calendar, MapPin, Home, User, Briefcase, Users, Globe, Target, Sparkles, Book } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingProps {
  onComplete: () => void;
}

interface StepData {
  title: string;
  subtitle: string;
  icon: any;
  field: string;
  type: string;
  placeholder: string;
  required: boolean;
  options?: string[];
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    // Basic Information (Step 1-5)
    name: '',
    age: '',
    birthDate: '',
    birthPlace: '',
    currentLocation: '',
    
    // Professional & Personal (Step 6-7)
    occupation: '',
    relationshipStatus: '',
    
    // Cultural Background (Step 8)
    culturalBackground: '',
    languagesSpoken: '',
    
    // Life & Interests (Step 9-10)
    hobbiesInterests: '',
    majorLifeEvent: '',
    
    // Values & Personality (Step 11-12)
    coreValues: '',
    lifeGoals: ''
  });

  const steps: StepData[] = [
    // Basic Identity
    {
      title: "What's your name?",
      subtitle: "The name you'd like to be remembered by",
      icon: User,
      field: 'name',
      type: 'text',
      placeholder: 'Enter your name...',
      required: true
    },
    {
      title: "How old are you?",
      subtitle: "This helps us understand your life's timeline",
      icon: Calendar,
      field: 'age',
      type: 'number',
      placeholder: 'Enter your age...',
      required: true
    },
    {
      title: "When were you born?",
      subtitle: "Your birth date anchors your memory timeline",
      icon: Calendar,
      field: 'birthDate',
      type: 'date',
      placeholder: '',
      required: true
    },
    {
      title: "Where were you born?",
      subtitle: "The place where your story began",
      icon: MapPin,
      field: 'birthPlace',
      type: 'text',
      placeholder: 'City, Country...',
      required: true
    },
    {
      title: "Where do you live now?",
      subtitle: "Your current home in the world",
      icon: Home,
      field: 'currentLocation',
      type: 'text',
      placeholder: 'City, Country...',
      required: true
    },
    
    // Professional Life
    {
      title: "What do you do for a living?",
      subtitle: "Your work or what keeps you busy",
      icon: Briefcase,
      field: 'occupation',
      type: 'text',
      placeholder: 'e.g., Software Engineer, Teacher, Student, Retired...',
      required: true
    },
    
    // Personal Life
    {
      title: "What's your relationship status?",
      subtitle: "Helps us understand your life context",
      icon: Heart,
      field: 'relationshipStatus',
      type: 'select',
      placeholder: 'Select one...',
      options: ['Single', 'In a relationship', 'Engaged', 'Married', 'Divorced', 'Widowed', 'It\'s complicated', 'Prefer not to say'],
      required: false
    },
    
    // Cultural Background
    {
      title: "What's your cultural background?",
      subtitle: "The cultures and traditions that shaped you",
      icon: Globe,
      field: 'culturalBackground',
      type: 'text',
      placeholder: 'e.g., Indian, Chinese-American, Brazilian...',
      required: false
    },
    
    {
      title: "What languages do you speak?",
      subtitle: "All the languages you're comfortable with",
      icon: Book,
      field: 'languagesSpoken',
      type: 'text',
      placeholder: 'e.g., English, Spanish, Mandarin...',
      required: false
    },
    
    // Life & Interests
    {
      title: "What do you love doing?",
      subtitle: "Your hobbies, passions, and interests",
      icon: Sparkles,
      field: 'hobbiesInterests',
      type: 'textarea',
      placeholder: 'e.g., Reading, hiking, cooking, playing guitar, photography...',
      required: false
    },
    
    {
      title: "Share a moment that defined you",
      subtitle: "A major life event that shaped who you are today",
      icon: Calendar,
      field: 'majorLifeEvent',
      type: 'textarea',
      placeholder: 'e.g., Graduating college, moving to a new country, starting a family, a career change...',
      required: false
    },
    
    // Values & Goals
    {
      title: "What matters most to you?",
      subtitle: "Your core values and principles",
      icon: Heart,
      field: 'coreValues',
      type: 'textarea',
      placeholder: 'e.g., Family, honesty, creativity, kindness, learning, helping others...',
      required: false
    },
    
    {
      title: "What are you working towards?",
      subtitle: "Your dreams, aspirations, and life goals",
      icon: Target,
      field: 'lifeGoals',
      type: 'textarea',
      placeholder: 'e.g., Build a successful career, travel the world, start a family, learn new skills...',
      required: false
    }
  ];

  const currentStepData = steps[currentStep - 1];

  const handleNext = () => {
    const currentValue = formData[currentStepData.field as keyof typeof formData];
    
    // Only validate required fields
    if (currentStepData.required && !currentValue?.toString().trim()) {
      toast({
        title: "Please fill in this field",
        description: "We need this information to create your timeline.",
        variant: "destructive"
      });
      return;
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSkip = () => {
    if (confirm('Are you sure you want to skip this setup? You can complete it later from your profile settings.')) {
      toast({
        title: "Setup skipped",
        description: "You can complete your profile anytime from settings.",
      });
      onComplete();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('No user found');
      }

      // Helper to split comma-separated strings into arrays
      const splitToArray = (str: string) => {
        return str ? str.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
      };

      // Calculate completeness score based on filled fields
      const filledFields = Object.values(formData).filter(v => v && v.toString().trim()).length;
      const totalFields = Object.keys(formData).length;
      const completenessScore = Math.round((filledFields / totalFields) * 100);

      const profileData = {
        user_id: user.id,
        
        // Basic Information
        preferred_name: formData.name,
        age: parseInt(formData.age),
        location: formData.currentLocation,
        hometown: formData.birthPlace,
        occupation: formData.occupation || null,
        relationship_status: formData.relationshipStatus || null,
        
        // Cultural Background
        cultural_background: splitToArray(formData.culturalBackground),
        languages_spoken: splitToArray(formData.languagesSpoken),
        
        // Life & Interests
        hobbies_interests: splitToArray(formData.hobbiesInterests),
        major_life_events: formData.majorLifeEvent ? [{
          event: formData.majorLifeEvent,
          significance: "Shared during onboarding",
          year: new Date().getFullYear()
        }] : [],
        
        // Values & Goals
        core_values: splitToArray(formData.coreValues),
        life_goals: splitToArray(formData.lifeGoals),
        
        // Metadata
        onboarding_completed: true,
        first_conversation_completed: false,
        profile_completeness_score: completenessScore,
      };

      console.log('📝 Saving comprehensive onboarding data:', profileData);

      // Use user_profiles table with correct column mappings
      const { data: upsertData, error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(profileData, { 
          onConflict: 'user_id' 
        })
        .select();

      if (upsertError) {
        console.error('❌ Profile upsert error:', upsertError);
        throw upsertError;
      }

      console.log('✅ Onboarding data saved successfully:', upsertData);

      toast({
        title: "Welcome to Memory Scape! 🌟",
        description: `Your sanctuary has been created. Profile ${completenessScore}% complete!`,
      });

      onComplete();
    } catch (error) {
      console.error('❌ Onboarding error:', error);
      
      // Show detailed error to help debugging
      let errorMessage = 'Unknown error occurred';
      let errorDetails = '';
      
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = String(error.message);
        }
        if ('details' in error) {
          errorDetails = String(error.details);
        }
        if ('hint' in error) {
          errorDetails += (errorDetails ? ' | ' : '') + String(error.hint);
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Couldn't save your profile",
        description: errorDetails || errorMessage,
        variant: "destructive"
      });
      
      // Don't keep user stuck - offer to skip
      const shouldSkip = confirm(`There was an error saving your profile:\n\n${errorMessage}\n${errorDetails}\n\nWould you like to skip this step and continue? You can complete your profile later from settings.`);
      if (shouldSkip) {
        onComplete();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const StepIcon = currentStepData.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-memory/10 flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-card/95 backdrop-blur-md border-primary/30 shadow-cosmic">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary/30 to-memory/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-light text-foreground">
            Welcome to Memory Scape
          </CardTitle>
          <p className="text-muted-foreground">
            Step {currentStep} of {steps.length}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-memory/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
              <StepIcon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-medium text-foreground">
              {currentStepData.title}
            </h3>
            <p className="text-muted-foreground text-sm">
              {currentStepData.subtitle}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={currentStepData.field} className="text-foreground">
              {currentStepData.required && <span className="text-destructive mr-1">*</span>}
              {currentStepData.title}
            </Label>
            
            {currentStepData.type === 'textarea' ? (
              <Textarea
                id={currentStepData.field}
                placeholder={currentStepData.placeholder}
                value={formData[currentStepData.field as keyof typeof formData]}
                onChange={(e) => updateFormData(currentStepData.field, e.target.value)}
                className="bg-background/50 border-primary/30 min-h-[120px] resize-none"
                autoFocus
              />
            ) : currentStepData.type === 'select' ? (
              <select
                id={currentStepData.field}
                value={formData[currentStepData.field as keyof typeof formData]}
                onChange={(e) => updateFormData(currentStepData.field, e.target.value)}
                className="w-full px-3 py-2 bg-background/50 border border-primary/30 rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              >
                <option value="">{currentStepData.placeholder}</option>
                {currentStepData.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={currentStepData.field}
                type={currentStepData.type}
                placeholder={currentStepData.placeholder}
                value={formData[currentStepData.field as keyof typeof formData]}
                onChange={(e) => updateFormData(currentStepData.field, e.target.value)}
                className="bg-background/50 border-primary/30"
                autoFocus
              />
            )}
            
            {!currentStepData.required && (
              <p className="text-xs text-muted-foreground">Optional - but helps us know you better</p>
            )}
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleNext} 
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-primary to-memory hover:from-primary/90 hover:to-memory/90 text-white shadow-starlight"
            >
              {currentStep < steps.length ? (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : isSubmitting ? (
                'Creating your sanctuary...'
              ) : (
                'Complete Setup'
              )}
            </Button>
            
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button 
                  variant="ghost" 
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex-1 text-muted-foreground hover:text-foreground"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={handleSkip}
                className="flex-1 text-muted-foreground hover:text-foreground border-primary/30"
                disabled={isSubmitting}
              >
                Skip for Now
              </Button>
            </div>
          </div>

          <div className="w-full bg-primary/10 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary to-memory h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;