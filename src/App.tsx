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
import TimelineOrbit from "./pages/TimelineOrbit";
import Story from "./pages/Story";
import Reconstruction from "./pages/Reconstruction";
import Identities from "./pages/Identities";
import Settings from "./pages/Settings";
import Journal from "./pages/Journal";
import Visitor from "./pages/Visitor";
import Archive from "./pages/Archive";
import ArchiveSimple from "./pages/ArchiveSimple";
import TestMemoryRecordings from "./pages/TestMemoryRecordings";

import About from "./pages/About";
import HowItWorks from "./pages/HowItWorks";
import BetaLanding from "./pages/BetaLanding";
import Auth from "./pages/Auth";
import Navigation from "./components/Navigation";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Onboarding from "./components/Onboarding";
import VoiceTest from "./components/VoiceTest";
import MicImagePreview from "./pages/MicImagePreview";
import MicTest from "./pages/MicTest";
import ScrollToTop from "./components/ScrollToTop";
import ParticleFace from "./pages/ParticleFace";

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
      <ScrollToTop />
      <Navigation />
      <Routes>
        {/* Authentication-based routing */}
        {/* Non-signed-in users: Always land on Beta Landing page */}
        {/* Signed-in users: Always land on Sanctuary (Solin) page */}
        <Route path="/" element={user ? <Navigate to="/sanctuary" replace /> : <BetaLanding />} />
        {/* About page hidden during beta - uncomment when ready to reveal */}
        {/* <Route path="/about" element={<About />} /> */}
        <Route path="/sanctuary" element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        } />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/visitor/:userId" element={<Visitor />} />
        <Route path="/mic-preview" element={<MicImagePreview />} />
        <Route path="/auth" element={user ? <Navigate to="/sanctuary" replace /> : <Auth />} />
        <Route path="/signup" element={user ? <Navigate to="/sanctuary" replace /> : <Auth />} />
        <Route path="/signin" element={user ? <Navigate to="/sanctuary" replace /> : <Auth />} />
        
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
        <Route path="/timeline-orbit" element={
          <ProtectedRoute>
            <TimelineOrbit />
          </ProtectedRoute>
        } />
        <Route path="/archive" element={<Archive />} />
        <Route path="/archive-simple" element={<ArchiveSimple />} />
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
        <Route path="/mic-test" element={<MicTest />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/test-memory-recordings" element={
          <ProtectedRoute>
            <TestMemoryRecordings />
          </ProtectedRoute>
        } />
        <Route path="/particle-face" element={
          <ProtectedRoute>
            <ParticleFace />
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
    <AuthProvider>
      <DemoProvider>
        <BrowserRouter>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </BrowserRouter>
      </DemoProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
