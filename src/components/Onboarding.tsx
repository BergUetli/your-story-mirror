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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          age: parseInt(formData.age),
          birth_date: formData.birthDate,
          birth_place: formData.birthPlace,
          current_location: formData.currentLocation,
          onboarding_completed: true
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Welcome to Memory Scape! 🌟",
        description: "Your sanctuary has been created. Start preserving your memories.",
      });

      onComplete();
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive"
      });
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
            
            {currentStep > 1 && (
              <Button 
                variant="ghost" 
                onClick={() => setCurrentStep(currentStep - 1)}
                className="w-full text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}
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