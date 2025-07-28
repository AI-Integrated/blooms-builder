import { Button } from "@/components/ui/button";
import { GraduationCap, Menu, User } from "lucide-react";

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
                    className="text-foreground/80 hover:text-foreground transition-smooth"
                  >
                    Admin Panel
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