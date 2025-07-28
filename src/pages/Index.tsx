import { useState } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { AuthForm } from "@/components/AuthForm";
import { Dashboard } from "@/components/Dashboard";
import { TOSBuilder } from "@/components/TOSBuilder";
import { QuestionBank } from "@/components/QuestionBank";
import { TestGenerator } from "@/components/TestGenerator";
import { toast } from "sonner";

const Index = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard' | 'tos-builder' | 'question-bank' | 'test-generator'>('landing');
  const [user, setUser] = useState<{
    isAuthenticated: boolean;
    role?: 'admin' | 'teacher';
    name?: string;
    email?: string;
  }>({
    isAuthenticated: false
  });

  const handleLogin = (email: string, password: string) => {
    // Demo authentication logic
    if (email === "demonstration595@gmail.com" && password === "admin123456789") {
      setUser({
        isAuthenticated: true,
        role: 'admin',
        name: 'Admin User',
        email: email
      });
      setCurrentView('dashboard');
      toast.success("Welcome back, Admin!");
    } else {
      // For demo purposes, any other email/password combo logs in as teacher
      setUser({
        isAuthenticated: true,
        role: 'teacher',
        name: email.split('@')[0],
        email: email
      });
      setCurrentView('dashboard');
      toast.success(`Welcome back, ${email.split('@')[0]}!`);
    }
  };

  const handleRegister = (name: string, email: string, password: string) => {
    // Demo registration - creates teacher account
    setUser({
      isAuthenticated: true,
      role: 'teacher',
      name: name,
      email: email
    });
    setCurrentView('dashboard');
    toast.success(`Welcome to TestCraft AI, ${name}!`);
  };

  const handleLogout = () => {
    setUser({ isAuthenticated: false });
    setCurrentView('landing');
    toast.success("Logged out successfully");
  };

  const showAuth = () => {
    setCurrentView('auth');
  };

  const hideAuth = () => {
    setCurrentView('landing');
  };

  const handleNavigation = (section: string) => {
    if (section === 'TOS Builder') {
      setCurrentView('tos-builder');
    } else if (section === 'Question Bank') {
      setCurrentView('question-bank');
    } else if (section === 'Test Generator') {
      setCurrentView('test-generator');
    } else if (section === 'Dashboard') {
      setCurrentView('dashboard');
    } else {
      toast.info(`${section} feature coming soon!`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        isAuthenticated={user.isAuthenticated}
        userRole={user.role}
        userName={user.name}
        onLogin={showAuth}
        onLogout={handleLogout}
        onNavigate={handleNavigation}
      />
      
      {currentView === 'landing' && (
        <HeroSection 
          onGetStarted={showAuth}
          onLearnMore={() => toast.info("Learn more section coming soon!")}
        />
      )}

      {currentView === 'auth' && (
        <AuthForm 
          onLogin={handleLogin}
          onRegister={handleRegister}
          onClose={hideAuth}
        />
      )}

      {currentView === 'dashboard' && user.isAuthenticated && (
        <Dashboard 
          userRole={user.role!}
          userName={user.name!}
          onNavigate={handleNavigation}
        />
      )}

      {currentView === 'tos-builder' && user.isAuthenticated && (
        <div className="container mx-auto py-8">
          <TOSBuilder onBack={() => setCurrentView('dashboard')} />
        </div>
      )}

      {currentView === 'question-bank' && user.isAuthenticated && (
        <div className="container mx-auto py-8">
          <QuestionBank onBack={() => setCurrentView('dashboard')} />
        </div>
      )}

      {currentView === 'test-generator' && user.isAuthenticated && (
        <div className="container mx-auto py-8">
          <TestGenerator onBack={() => setCurrentView('dashboard')} />
        </div>
      )}
    </div>
  );
};

export default Index;
