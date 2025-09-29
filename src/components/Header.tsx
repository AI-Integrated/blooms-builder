import { Button } from "@/components/ui/button";
import { GraduationCap, Menu, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRealtime } from "@/hooks/useRealtime";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface HeaderProps {
  isAuthenticated?: boolean;
  userRole?: 'admin' | 'teacher';
  userName?: string;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigate?: (section: string) => void;
}

export const Header = ({ 
  isAuthenticated = false, 
  userRole, 
  userName,
  onLogin,
  onLogout,
  onNavigate
}: HeaderProps) => {
  const [pendingReviews, setPendingReviews] = useState(0);
  const [systemStatus, setSystemStatus] = useState<'online' | 'offline'>('online');

  // Real-time monitoring for admin notifications
  useRealtime('header-notifications', {
    table: 'questions',
    filter: 'needs_review=eq.true',
    onInsert: () => {
      setPendingReviews(prev => prev + 1);
    },
    onUpdate: (question) => {
      if (!question.needs_review) {
        setPendingReviews(prev => Math.max(0, prev - 1));
      }
    }
  });

  // Load initial pending count
  useEffect(() => {
    if (isAuthenticated && userRole === 'admin') {
      loadPendingCount();
    }
  }, [isAuthenticated, userRole]);

  const loadPendingCount = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('id')
        .eq('needs_review', true);
      
      if (error) throw error;
      setPendingReviews(data?.length || 0);
    } catch (error) {
      console.error('Error loading pending count:', error);
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                TestCraft AI
              </span>
            </div>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            {isAuthenticated && (
              <>
                <button 
                  onClick={() => onNavigate?.('Dashboard')} 
                  className="text-foreground/80 hover:text-foreground transition-smooth"
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => onNavigate?.('TOS Builder')} 
                  className="text-foreground/80 hover:text-foreground transition-smooth"
                >
                  TOS Builder
                </button>
                <button 
                  onClick={() => onNavigate?.('Question Bank')} 
                  className="text-foreground/80 hover:text-foreground transition-smooth"
                >
                  Question Bank
                </button>
                <button 
                  onClick={() => onNavigate?.('Test Generator')} 
                  className="text-foreground/80 hover:text-foreground transition-smooth"
                >
                  Test Generator
                </button>
                {userRole === 'admin' && (
                  <button 
                    onClick={() => onNavigate?.('Admin Panel')} 
                    className="text-foreground/80 hover:text-foreground transition-smooth relative"
                  >
                    Admin Panel
                    {pendingReviews > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                      >
                        {pendingReviews}
                      </Badge>
                    )}
                  </button>
                )}
              </>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">{userName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                    {userRole}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${systemStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs text-muted-foreground">{systemStatus}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Button variant="hero" onClick={onLogin}>
                Login
              </Button>
            )}
            
            {/* Mobile Menu Button */}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};