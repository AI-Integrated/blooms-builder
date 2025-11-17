import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, 
  FileText, 
  Sparkles, 
  Clock,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  BookOpen,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const teacherMenuItems = [
  { 
    title: "Dashboard", 
    href: "/teacher/dashboard", 
    icon: LayoutDashboard,
    description: "Personal overview" 
  },
  { 
    title: "TOS Builder", 
    href: "/teacher/tos", 
    icon: FileText,
    description: "Create specifications" 
  },
  { 
    title: "AI Test Generator", 
    href: "/teacher/generate-test", 
    icon: Sparkles,
    description: "Generate tests" 
  },
  { 
    title: "My Tests", 
    href: "/teacher/my-tests", 
    icon: BookOpen,
    description: "View generated tests" 
  },
  { 
    title: "Export & Print", 
    href: "/teacher/export", 
    icon: FileText,
    description: "Professional exports" 
  },
  { 
    title: "Rubrics", 
    href: "/teacher/rubrics", 
    icon: Target,
    description: "Scoring rubrics" 
  },
  { 
    title: "Test History", 
    href: "/teacher/history", 
    icon: Clock,
    description: "Past questionnaires" 
  },
  { 
    title: "Reports", 
    href: "/teacher/reports", 
    icon: BarChart3,
    description: "Usage statistics" 
  },
];

const bottomMenuItems = [
  { 
    title: "Settings", 
    href: "/teacher/settings", 
    icon: Settings,
    description: "Account preferences" 
  },
];

interface TeacherLayoutProps {
  children: ReactNode;
}

export function TeacherLayout({ children }: TeacherLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div 
        className={cn(
          "flex flex-col h-screen bg-card border-r border-border transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">EduTest AI</h1>
                <p className="text-xs text-muted-foreground">Teacher Portal</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="shrink-0"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {teacherMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
                  active 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{item.title}</div>
                    <div className={cn(
                      "text-xs truncate",
                      active ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {item.description}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <nav className="p-2 space-y-1 border-t border-border">
          {bottomMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                  active 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <div className="font-medium">{item.title}</div>}
              </Link>
            );
          })}
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 w-full hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <div className="font-medium">Sign Out</div>}
          </button>
        </nav>

        {/* User Info */}
        {!collapsed && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">{user?.email}</div>
                <div className="text-xs text-muted-foreground">Teacher</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
