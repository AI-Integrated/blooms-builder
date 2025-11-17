import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  CheckCircle, 
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  Brain,
  Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const adminMenuItems = [
  { 
    title: "Dashboard", 
    href: "/admin/dashboard", 
    icon: LayoutDashboard,
    description: "System overview" 
  },
  { 
    title: "User Management", 
    href: "/admin/users", 
    icon: Users,
    description: "Manage teachers" 
  },
  { 
    title: "Question Bank", 
    href: "/admin/question-bank", 
    icon: Database,
    description: "Full CRUD access" 
  },
  { 
    title: "Bulk Import", 
    href: "/admin/bulk-import", 
    icon: Upload,
    description: "Import questions" 
  },
  { 
    title: "Question Approvals", 
    href: "/admin/approvals", 
    icon: CheckCircle,
    description: "Review AI questions" 
  },
  { 
    title: "AI Generation Logs", 
    href: "/admin/ai-logs", 
    icon: FileText,
    description: "Monitor AI activity" 
  },
  { 
    title: "System Analytics", 
    href: "/admin/analytics", 
    icon: BarChart3,
    description: "Performance metrics" 
  },
  { 
    title: "Quality Assurance", 
    href: "/admin/quality", 
    icon: CheckCircle,
    description: "ISO 25010 metrics" 
  },
  { 
    title: "Test Assembly", 
    href: "/admin/test-assembly", 
    icon: FileText,
    description: "Advanced test builder" 
  },
];

const bottomMenuItems = [
  { 
    title: "Settings", 
    href: "/admin/settings", 
    icon: Settings,
    description: "System configuration" 
  },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <div 
        className={cn(
          "flex flex-col h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-100">Admin Panel</h1>
                <p className="text-xs text-slate-400">System Management</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="shrink-0 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
                  active 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{item.title}</div>
                    <div className={cn(
                      "text-xs truncate",
                      active ? "text-blue-100" : "text-slate-400"
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
        <nav className="p-2 space-y-1 border-t border-slate-800">
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
                    ? "bg-blue-600 text-white" 
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <div className="font-medium">{item.title}</div>}
              </Link>
            );
          })}
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 w-full text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <div className="font-medium">Sign Out</div>}
          </button>
        </nav>

        {/* User Info */}
        {!collapsed && (
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-slate-100">{user?.email}</div>
                <div className="text-xs text-slate-400">Administrator</div>
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
