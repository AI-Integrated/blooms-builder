import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { 
  LayoutDashboard, 
  File, 
  HelpCircle, 
  ClipboardList, 
  BarChart3,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Brain
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const menuItems = [
  { 
    title: "Dashboard", 
    href: "/", 
    icon: LayoutDashboard,
    description: "Overview and analytics" 
  },
  { 
    title: "Table of Specifications", 
    href: "/tos", 
    icon: File,
    description: "Create test blueprints" 
  },
  { 
    title: "Question Bank", 
    href: "/question-bank", 
    icon: HelpCircle,
    description: "Manage test questions" 
  },
  { 
    title: "Test Generator", 
    href: "/generator", 
    icon: ClipboardList,
    description: "Create and export tests" 
  },
  { 
    title: "AI Assistant", 
    href: "/ai-assistant", 
    icon: Brain,
    description: "AI-powered question generation" 
  },
  { 
    title: "Analytics", 
    href: "/analytics", 
    icon: BarChart3,
    description: "Usage and performance metrics" 
  },
]

const bottomMenuItems = [
  { 
    title: "Learning Resources", 
    href: "/resources", 
    icon: BookOpen,
    description: "Educational materials" 
  },
  { 
    title: "Profile", 
    href: "/profile", 
    icon: User,
    description: "Account settings" 
  },
  { 
    title: "Settings", 
    href: "/settings", 
    icon: Settings,
    description: "Application preferences" 
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/"
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div 
      className={cn(
        "flex flex-col h-screen bg-card border-r border-border transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">EduTest AI</h1>
              <p className="text-xs text-muted-foreground">Test Generator</p>
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
      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
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
          )
        })}
      </nav>

      {/* Bottom Navigation */}
      <nav className="p-2 space-y-1 border-t border-border">
        {bottomMenuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
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
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-accent rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">John Educator</div>
              <div className="text-xs text-muted-foreground">Admin</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}