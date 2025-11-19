import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ArrowLeft } from 'lucide-react';

const Auth = () => {
  const location = useLocation();
  
  // Determine initial mode based on route
  const getInitialMode = () => {
    if (location.pathname === '/signin') return false; // Sign-in mode
    if (location.pathname === '/signup') return true;  // Sign-up mode  
    return true; // Default to sign-up for new users
  };
  
  const [isSignUp, setIsSignUp] = useState(getInitialMode());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { signIn, signUp, user, resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Update mode when route changes
  useEffect(() => {
    setIsSignUp(getInitialMode());
  }, [location.pathname]);

  // Redirect if already authenticated - send to Sanctuary (Solin) page
  useEffect(() => {
    if (user) {
      navigate('/sanctuary');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Password confirmation validation
    if (isSignUp && password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          throw error;
        }
        toast({
          title: "Account Created!",
          description: "You can now sign in and start preserving your memories.",
        });
        setIsSignUp(false);
        resetForm();
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          throw error;
        }
        toast({
          title: "Welcome back!",
          description: "Successfully signed in to your account.",
        });
        // Redirect signed-in users to the Sanctuary (Solin) page
        navigate('/sanctuary');
      }
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message?.includes('User already registered')) {
        errorMessage = 'This email is already registered. Try signing in instead.';
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: isSignUp ? "Sign Up Failed" : "Sign In Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setIsForgotPassword(false);
    resetForm();
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;

      toast({
        title: "Check Your Email",
        description: "We've sent you a password reset link. Please check your inbox.",
      });
      setIsForgotPassword(false);
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Back to Home */}
        <Link 
          to="/" 
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <Card className="modern-card border-border/50">
          <CardContent className="p-8">
            <div className="text-center space-y-2 mb-8">
              <h1 className="text-3xl font-bold">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h1>
              <p className="text-muted-foreground">
                {isSignUp 
                  ? 'Start preserving your life memories today' 
                  : 'Sign in to access your memories'
                }
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={isSignUp}
                    disabled={isLoading}
                    className="bg-card border-border"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-card border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={isSignUp ? "Create a password (min. 6 characters)" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!isForgotPassword}
                  disabled={isLoading}
                  minLength={6}
                  className="bg-card border-border"
                />
                {!isSignUp && !isForgotPassword && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                    disabled={isLoading}
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {isSignUp && !isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                    className="bg-card border-border"
                  />
                </div>
              )}

              {isForgotPassword ? (
                <div className="space-y-3">
                  <Button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="w-full bg-primary hover:bg-primary/90 rounded-full" 
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending Reset Link...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsForgotPassword(false)}
                    className="w-full rounded-full"
                    disabled={isLoading}
                    size="lg"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 rounded-full" 
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isSignUp ? 'Creating Account...' : 'Signing In...'}
                    </>
                  ) : (
                    isSignUp ? 'Create Account' : 'Sign In'
                  )}
                </Button>
              )}
            </form>

            <div className="mt-6 text-center">
              {!isForgotPassword && (
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-sm text-primary hover:underline"
                  disabled={isLoading}
                >
                  {isSignUp 
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"
                  }
                </button>
              )}
            </div>

            {isSignUp && (
              <div className="mt-6 text-xs text-muted-foreground text-center">
                By creating an account, you agree to preserve and share your memories 
                responsibly. We'll help you create a lasting digital legacy.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
