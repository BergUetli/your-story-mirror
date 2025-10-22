import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, ArrowRight, Calendar, MapPin, Home, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    birthDate: '',
    birthPlace: '',
    currentLocation: ''
  });

  const steps = [
    {
      title: "What's your name?",
      subtitle: "The name you'd like to be remembered by",
      icon: User,
      field: 'name',
      type: 'text',
      placeholder: 'Enter your name...'
    },
    {
      title: "How old are you?",
      subtitle: "This helps us understand your life's timeline",
      icon: Calendar,
      field: 'age',
      type: 'number',
      placeholder: 'Enter your age...'
    },
    {
      title: "When were you born?",
      subtitle: "Your birth date anchors your memory timeline",
      icon: Calendar,
      field: 'birthDate',
      type: 'date',
      placeholder: ''
    },
    {
      title: "Where were you born?",
      subtitle: "The place where your story began",
      icon: MapPin,
      field: 'birthPlace',
      type: 'text',
      placeholder: 'City, Country...'
    },
    {
      title: "Where do you live now?",
      subtitle: "Your current home in the world",
      icon: Home,
      field: 'currentLocation',
      type: 'text',
      placeholder: 'City, Country...'
    }
  ];

  const currentStepData = steps[currentStep - 1];

  const handleNext = () => {
    const currentValue = formData[currentStepData.field as keyof typeof formData];
    if (!currentValue.trim()) {
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

      const profileData = {
        user_id: user.id,
        preferred_name: formData.name,  // name → preferred_name
        age: parseInt(formData.age),
        location: formData.currentLocation,  // current_location → location
        hometown: formData.birthPlace,  // birth_place → hometown
        onboarding_completed: true,
        first_conversation_completed: false,
        profile_completeness_score: 25,
      };

      console.log('📝 Saving onboarding data to user_profiles:', profileData);
      console.log('📝 Form data:', formData);
      console.log('📝 User ID:', user.id);
      console.log('📝 Age parsed:', parseInt(formData.age), 'from', formData.age);

      // Use user_profiles table with correct column mappings
      const { data: upsertData, error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(profileData, { 
          onConflict: 'user_id' 
        })
        .select();

      console.log('📝 Upsert response data:', upsertData);
      console.log('📝 Upsert response error:', upsertError);

      if (upsertError) {
        console.error('❌ Profile upsert error:', upsertError);
        console.error('❌ Error details:', {
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint,
          code: upsertError.code
        });
        throw upsertError;
      }

      console.log('✅ Onboarding data saved successfully:', upsertData);

      toast({
        title: "Welcome to Memory Scape! 🌟",
        description: "Your sanctuary has been created. Start preserving your memories.",
      });

      onComplete();
    } catch (error) {
      console.error('❌ Onboarding error (full object):', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error JSON:', JSON.stringify(error, null, 2));
      
      // Show detailed error to help debugging
      let errorMessage = 'Unknown error occurred';
      let errorDetails = '';
      
      if (error && typeof error === 'object') {
        // PostgrestError from Supabase
        if ('message' in error) {
          errorMessage = String(error.message);
        }
        if ('details' in error) {
          errorDetails = String(error.details);
        }
        if ('hint' in error) {
          errorDetails += (errorDetails ? ' | ' : '') + String(error.hint);
        }
        if ('code' in error) {
          errorDetails += (errorDetails ? ' | ' : '') + `Code: ${error.code}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error('❌ Parsed error message:', errorMessage);
      console.error('❌ Parsed error details:', errorDetails);
      
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
              Your {currentStepData.field === 'currentLocation' ? 'current location' : currentStepData.field}
            </Label>
            <Input
              id={currentStepData.field}
              type={currentStepData.type}
              placeholder={currentStepData.placeholder}
              value={formData[currentStepData.field as keyof typeof formData]}
              onChange={(e) => updateFormData(currentStepData.field, e.target.value)}
              className="bg-background/50 border-primary/30"
              autoFocus
            />
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