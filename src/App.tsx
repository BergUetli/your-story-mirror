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
import Story from "./pages/Story";
import Reconstruction from "./pages/Reconstruction";
import Identities from "./pages/Identities";
import Settings from "./pages/Settings";
import Journal from "./pages/Journal";
import Visitor from "./pages/Visitor";

import About from "./pages/About";
import HowItWorks from "./pages/HowItWorks";
import Auth from "./pages/Auth";
import SidebarNavigation from "./components/SidebarNavigation";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Onboarding from "./components/Onboarding";
import VoiceTest from "./components/VoiceTest";
import MicImagePreview from "./pages/MicImagePreview";

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
    <div className="flex min-h-screen">
      <SidebarNavigation />
      {/* Main content area with left margin for sidebar */}
      <div className="flex-1 ml-0 md:ml-[4.5rem] transition-all duration-300 min-h-screen">
        <Routes>
        {/* Authentication-based routing */}
        <Route path="/" element={user ? <Navigate to="/sanctuary" replace /> : <About />} />
        <Route path="/about" element={<About />} />
        <Route path="/sanctuary" element={<Index />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/visitor/:userId" element={<Visitor />} />
        <Route path="/mic-preview" element={<MicImagePreview />} />
        <Route path="/auth" element={user ? <Navigate to="/sanctuary" replace /> : <Auth />} />
        
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
        <Route path="/story" element={
          <ProtectedRoute>
            <Story />
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
        <Route path="/admin" element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        } />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
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
