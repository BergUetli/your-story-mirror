import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Phone, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}

const COUNTRY_CODES = [
  { code: '+1', name: 'US/Canada' },
  { code: '+44', name: 'UK' },
  { code: '+91', name: 'India' },
  { code: '+86', name: 'China' },
  { code: '+81', name: 'Japan' },
  { code: '+49', name: 'Germany' },
  { code: '+33', name: 'France' },
  { code: '+39', name: 'Italy' },
  { code: '+34', name: 'Spain' },
  { code: '+61', name: 'Australia' },
  { code: '+55', name: 'Brazil' },
  { code: '+52', name: 'Mexico' },
  { code: '+27', name: 'South Africa' },
  { code: '+41', name: 'Switzerland' },
];

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { signOut } = useAuth();
  
  const [formData, setFormData] = useState({
    birthDate: '',
    birthPlace: '',
    phoneNumber: '',
    countryCode: '+1'
  });

  const steps: StepData[] = [
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
      title: "What's your phone number?",
      subtitle: "Stay connected with your memories",
      icon: Phone,
      field: 'phoneNumber',
      type: 'phone',
      placeholder: 'Phone number...',
      required: true
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

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out? You can complete this setup when you sign in again.')) {
      await signOut();
      toast({
        title: "Signed out",
        description: "You've been signed out. See you next time!",
      });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('No user found');
      }

      // Update user profile with birth info
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          onboarding_completed: true,
          profile_completeness_score: 100
        });

      if (profileError) throw profileError;

      // Update users table with birth info
      const { error: usersError } = await supabase
        .from('users')
        .update({
          birth_date: formData.birthDate,
          birth_place: formData.birthPlace,
          onboarding_completed: true
        })
        .eq('user_id', user.id);

      if (usersError) throw usersError;

      // Save phone number if provided
      if (formData.phoneNumber) {
        const fullPhoneNumber = `${formData.countryCode}${formData.phoneNumber}`;
        const { error: phoneError } = await supabase
          .from('user_phone_numbers')
          .upsert({
            user_id: user.id,
            phone_number: fullPhoneNumber,
            provider: 'whatsapp',
            verified: false
          });

        if (phoneError) throw phoneError;
      }

      toast({
        title: "Welcome to 1000years.ai! 🎉",
        description: "Your Memory Scape is ready. Start preserving your life's journey.",
      });

      onComplete();
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderField = () => {
    const field = currentStepData.field as keyof typeof formData;

    if (currentStepData.type === 'phone') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Country Code</Label>
            <Select
              value={formData.countryCode}
              onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
            >
              <SelectTrigger className="bg-card/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_CODES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.code} ({country.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              type="tel"
              value={formData[field]}
              onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
              placeholder={currentStepData.placeholder}
              className="bg-card/50 border-border text-lg"
              disabled={isSubmitting}
            />
          </div>
        </div>
      );
    }

    return (
      <Input
        type={currentStepData.type}
        value={formData[field]}
        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
        placeholder={currentStepData.placeholder}
        className="bg-card/50 border-border text-lg"
        disabled={isSubmitting}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-2xl">
        {/* Header with Sign Out */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Welcome to 1000years.ai</h1>
            <p className="text-muted-foreground">Let's set up your Memory Scape</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-muted-foreground">Step {currentStep} of {steps.length}</span>
            <span className="text-sm text-muted-foreground">{Math.round((currentStep / steps.length) * 100)}% Complete</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Card */}
        <Card className="modern-card border-border/50">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <currentStepData.icon className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl mb-2">{currentStepData.title}</CardTitle>
            <p className="text-muted-foreground">{currentStepData.subtitle}</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              {renderField()}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={isSubmitting}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? (
                  "Completing Setup..."
                ) : currentStep === steps.length ? (
                  "Complete Setup"
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
