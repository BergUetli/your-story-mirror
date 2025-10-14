import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute, DemoProvider } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import AddMemory from "./pages/AddMemory";
import Timeline from "./pages/Timeline";
import Reconstruction from "./pages/Reconstruction";
import Identities from "./pages/Identities";
import Settings from "./pages/Settings";
import Journal from "./pages/Journal";
import Visitor from "./pages/Visitor";

import About from "./pages/About";
import HowItWorks from "./pages/HowItWorks";
import Navigation from "./components/Navigation";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import Onboarding from "./components/Onboarding";
import VoiceTest from "./components/VoiceTest";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, needsOnboarding, checkOnboardingStatus } = useAuth();
  
  const handleOnboardingComplete = async () => {
    await checkOnboardingStatus();
  };

  // Show onboarding for users who haven't completed it
  if (user && needsOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="pb-16 md:pb-0">
      <Navigation />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<About />} />
        <Route path="/sanctuary" element={<Index />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/visitor/:userId" element={<Visitor />} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/journal" element={
          <ProtectedRoute>
            <Journal />
          </ProtectedRoute>
        } />
        <Route path="/add-memory" element={
          <ProtectedRoute>
            <AddMemory />
          </ProtectedRoute>
        } />
        <Route path="/timeline" element={
          <ProtectedRoute>
            <Timeline />
          </ProtectedRoute>
        } />
        <Route path="/reconstruction" element={
          <ProtectedRoute>
            <Reconstruction />
          </ProtectedRoute>
        } />
        <Route path="/identities" element={
          <ProtectedRoute>
            <Identities />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/voice-test" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
              <VoiceTest />
            </div>
          </ProtectedRoute>
        } />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <DemoProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </DemoProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
