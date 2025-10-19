import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Heart,
  User,
  MessageCircle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Users,
  Globe,
  Target,
  BookOpen,
  Mic,
  MicOff
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  firstConversationService, 
  type FirstConversationQuestion,
  type ConversationResponse
} from '@/services/firstConversationService';
import { userProfileService } from '@/services/userProfileService';

interface FirstConversationDialogProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const FirstConversationDialog: React.FC<FirstConversationDialogProps> = ({
  isOpen,
  onComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [currentQuestion, setCurrentQuestion] = useState<FirstConversationQuestion | null>(null);
  const [currentResponse, setCurrentResponse] = useState('');
  const [responses, setResponses] = useState<ConversationResponse[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [conversationStep, setConversationStep] = useState<'intro' | 'questions' | 'completing'>('intro');
  const [isListening, setIsListening] = useState(false);
  
  // Initialize first question
  useEffect(() => {
    if (isOpen && conversationStep === 'questions' && !currentQuestion) {
      const firstQuestion = firstConversationService.getNextQuestion([]);
      setCurrentQuestion(firstQuestion);
    }
  }, [isOpen, conversationStep, currentQuestion]);
  
  // Get progress
  const progress = firstConversationService.getConversationProgress(answeredQuestions);
  
  // Category icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'basic': return <User className="w-4 h-4" />;
      case 'relationships': return <Users className="w-4 h-4" />;
      case 'cultural': return <Globe className="w-4 h-4" />;
      case 'experiences': return <BookOpen className="w-4 h-4" />;
      case 'interests': return <Heart className="w-4 h-4" />;
      case 'values': return <Target className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };
  
  // Start conversation
  const startConversation = () => {
    setConversationStep('questions');
  };
  
  // Handle response submission
  const handleSubmitResponse = async () => {
    if (!currentQuestion || !currentResponse.trim() || !user?.id) return;
    
    setIsProcessing(true);
    
    try {
      // Process the response
      const { extractedData, suggestions } = await firstConversationService.processResponse(
        currentQuestion.id,
        currentResponse,
        user.id
      );
      
      // Add to responses
      const newResponse: ConversationResponse = {
        questionId: currentQuestion.id,
        response: currentResponse,
        extractedData
      };
      
      setResponses(prev => [...prev, newResponse]);
      setAnsweredQuestions(prev => [...prev, currentQuestion.id]);
      
      // Check for follow-up question
      const contextData = extractedData;
      const followUp = firstConversationService.getFollowUpQuestion(
        currentQuestion.id,
        currentResponse,
        contextData
      );
      
      if (followUp && Math.random() < 0.6) { // 60% chance of follow-up
        setFollowUpQuestion(followUp);
        setShowFollowUp(true);
      } else {
        // Move to next question
        await moveToNextQuestion();
      }
      
      setCurrentResponse('');
    } catch (error) {
      console.error('❌ Error processing response:', error);
      toast({
        title: 'Processing Error',
        description: 'Failed to process your response. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle follow-up response
  const handleFollowUpResponse = async () => {
    if (!followUpQuestion || !currentResponse.trim()) return;
    
    setShowFollowUp(false);
    setFollowUpQuestion(null);
    
    // Add follow-up as part of the previous response
    const lastResponseIndex = responses.length - 1;
    if (lastResponseIndex >= 0) {
      const updatedResponses = [...responses];
      updatedResponses[lastResponseIndex].response += `\n\nFollow-up: ${currentResponse}`;
      setResponses(updatedResponses);
    }
    
    setCurrentResponse('');
    await moveToNextQuestion();
  };
  
  // Move to next question
  const moveToNextQuestion = async () => {
    const nextQuestion = firstConversationService.getNextQuestion(answeredQuestions);
    
    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
    } else {
      // All questions answered, complete conversation
      await completeConversation();
    }
  };
  
  // Complete the conversation
  const completeConversation = async () => {
    if (!user?.id) return;
    
    setConversationStep('completing');
    
    try {
      console.log('🎯 Completing first conversation...');
      await firstConversationService.completeFirstConversation(user.id, responses);
      
      toast({
        title: 'Welcome to Solin!',
        description: 'Your profile has been created. I\'m excited to help you capture and explore your memories!',
      });
      
      // Short delay for UX
      setTimeout(() => {
        onComplete();
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error completing first conversation:', error);
      toast({
        title: 'Completion Error',
        description: 'Failed to save your profile. Please try again.',
        variant: 'destructive'
      });
      setConversationStep('questions');
    }
  };
  
  // Handle voice input (placeholder for future implementation)
  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    // TODO: Integrate with voice recording service
    toast({
      title: 'Voice Input',
      description: 'Voice input coming soon! For now, please type your response.',
    });
  };
  
  // Skip optional question
  const skipQuestion = async () => {
    if (!currentQuestion || currentQuestion.required) return;
    
    setAnsweredQuestions(prev => [...prev, currentQuestion.id]);
    await moveToNextQuestion();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <DialogTitle>Welcome to Solin!</DialogTitle>
          </div>
          <DialogDescription>
            Let's get to know each other so I can be your best digital companion.
          </DialogDescription>
        </DialogHeader>
        
        {conversationStep === 'intro' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Heart className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Hi! I'm Solin</h3>
                <p className="text-muted-foreground">
                  I'm your AI companion, designed to help you capture, explore, and cherish your memories. 
                  Before we begin, I'd love to learn about you, your life, and what matters most to you.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium mb-1">Personal</h4>
                  <p className="text-sm text-muted-foreground">About you and your relationships</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Globe className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium mb-1">Cultural</h4>
                  <p className="text-sm text-muted-foreground">Your background and influences</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Your Privacy Matters</p>
                  <p className="text-sm text-muted-foreground">
                    All information is stored securely and only used to personalize your Solin experience. 
                    You can update or delete your profile anytime.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={startConversation} className="gap-2">
                Let's Begin <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        
        {conversationStep === 'questions' && currentQuestion && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {getCategoryIcon(currentQuestion.category)}
                  {currentQuestion.category}
                </span>
                <span>{progress.completed} of {progress.total} questions</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
            </div>
            
            {/* Question */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base leading-relaxed">
                      {showFollowUp ? followUpQuestion : currentQuestion.question.replace('{name}', 
                        responses.find(r => r.extractedData?.preferred_name)?.extractedData.preferred_name || 'there'
                      )}
                    </p>
                    {currentQuestion.required && (
                      <Badge variant="outline" className="mt-2 text-xs">Required</Badge>
                    )}
                  </div>
                </div>
                
                {/* Response Input */}
                <div className="space-y-3">
                  <Textarea
                    value={currentResponse}
                    onChange={(e) => setCurrentResponse(e.target.value)}
                    placeholder="Share as much or as little as you're comfortable with..."
                    className="min-h-[100px] resize-none"
                    disabled={isProcessing}
                  />
                  
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleVoiceInput}
                      className="gap-2"
                    >
                      {isListening ? <Mic className="w-4 h-4 text-red-500" /> : <MicOff className="w-4 h-4" />}
                      Voice Input
                    </Button>
                    
                    <div className="flex gap-2">
                      {!currentQuestion.required && !showFollowUp && (
                        <Button variant="outline" size="sm" onClick={skipQuestion}>
                          Skip
                        </Button>
                      )}
                      <Button
                        onClick={showFollowUp ? handleFollowUpResponse : handleSubmitResponse}
                        disabled={!currentResponse.trim() || isProcessing}
                        className="gap-2"
                      >
                        {isProcessing ? (
                          'Processing...'
                        ) : (
                          <>Continue <ArrowRight className="w-4 h-4" /></>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Progress Summary */}
            {progress.completed > 0 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Great progress! {progress.requiredCompleted} of {progress.required} required questions completed.
                </p>
              </div>
            )}
          </div>
        )}
        
        {conversationStep === 'completing' && (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Creating Your Profile</h3>
              <p className="text-muted-foreground">
                Thank you for sharing! I'm setting up your personalized Solin experience...
              </p>
            </div>
            <div className="w-32 mx-auto">
              <Progress value={100} className="h-2" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};