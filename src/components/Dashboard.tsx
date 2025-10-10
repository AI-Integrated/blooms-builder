import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import { useRealtime } from "@/hooks/useRealtime";
import { 
  BookOpen, 
  Brain, 
  FileText, 
  Target, 
  TrendingUp, 
  Users,
  Clock,
  CheckCircle,
  BarChart3,
  Plus,
  GraduationCap
} from "lucide-react";

interface DashboardProps {
  userRole: 'admin' | 'teacher';
  userName: string;
  stats?: {
    totalTests: number;
    totalQuestions: number;
    tosCreated: number;
    recentActivity: number;
  };
  onNavigate?: (section: string) => void;
}

export const Dashboard = ({ 
  userRole, 
  userName, 
  stats = {
    totalTests: 12,
    totalQuestions: 245,
    tosCreated: 8,
    recentActivity: 3
  },
  onNavigate 
}: DashboardProps) => {
  
  const [realtimeActivity, setRealtimeActivity] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<'online' | 'offline'>('online');

  // Real-time activity monitoring
  useRealtime('dashboard-activity', {
    table: 'activity_log',
    onInsert: (newActivity) => {
      setRealtimeActivity(prev => [newActivity, ...prev.slice(0, 4)]);
    }
  });

  // Monitor system-wide changes
  useRealtime('dashboard-questions', {
    table: 'questions',
    onChange: () => {
      // Update stats in real-time when questions change
      setSystemStatus('online');
    }
  });

  const quickActions = [
    {
      title: "Create TOS",
      description: "Build Table of Specification",
      icon: Target,
      action: "TOS Builder",
      color: "text-primary"
    },
    {
      title: "Add Questions",
      description: "Expand question bank",
      icon: Plus,
      action: "question-bank",
      color: "text-secondary"
    },
    {
      title: "Generate Test",
      description: "Create new assessment",
      icon: FileText,
      action: "test-generator",
      color: "text-accent"
    },
    {
      title: "Multi-Version Tests",
      description: "Create A/B/C test versions",
      icon: TrendingUp,
      action: "multi-version-test",
      color: "text-purple-600"
    }
  ];

  const teacherActions = [
    {
      title: "Manage Rubrics",
      description: "Create evaluation rubrics",
      icon: BarChart3,
      action: "rubric-manager",
      color: "text-green-600"
    },
    {
      title: "Grade Essays",
      description: "Grade essay responses with rubrics",
      icon: GraduationCap,
      action: "essay-grading",
      color: "text-purple-600"
    }
  ];

  const collaborativeActions = [
    {
      title: "Collaborative Questions",
      description: "Work together on question bank",
      icon: Users,
      action: "collaborative-questions",
      color: "text-blue-600"
    }
  ];

  const adminActions = [
    {
      title: "AI Review Queue",
      description: "Review AI-generated questions",
      icon: CheckCircle,
      action: "ai-approval",
      color: "text-green-600"
    },
    {
      title: "AI Assistant",
      description: "Get question suggestions",
      icon: Brain,
      action: "ai-assistant",
      color: "text-primary-glow"
    }
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          Welcome back, {userName}! 👋
        </h1>
        <p className="text-muted-foreground">
          {userRole === 'admin' 
            ? "Monitor system performance and manage all users"
            : "Here's your assessment creation progress"
          }
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Created</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTests}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Question Bank</CardTitle>
            <BookOpen className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              +15 this week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOS Matrices</CardTitle>
            <Target className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tosCreated}</div>
            <p className="text-xs text-muted-foreground">
              All subjects covered
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Usage</CardTitle>
            <Brain className="h-4 w-4 text-primary-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity}</div>
            <p className="text-xs text-muted-foreground">
              Questions generated today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-smooth cursor-pointer group"
              onClick={() => onNavigate?.(action.action)}
            >
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-lg bg-muted/50 group-hover:bg-muted flex items-center justify-center transition-smooth">
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Teacher Tools */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Teacher Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teacherActions.map((action, index) => (
            <Card 
              key={`teacher-${index}`}
              className="bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-smooth cursor-pointer group"
              onClick={() => onNavigate?.(action.action)}
            >
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-lg bg-muted/50 group-hover:bg-muted flex items-center justify-center transition-smooth">
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Collaborative Tools */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Collaborative Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {collaborativeActions.map((action, index) => (
            <Card 
              key={`collaborative-${index}`}
              className="bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-smooth cursor-pointer group"
              onClick={() => onNavigate?.(action.action)}
            >
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-lg bg-muted/50 group-hover:bg-muted flex items-center justify-center transition-smooth">
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Admin-specific Quick Actions */}
      {userRole === 'admin' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Admin Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {adminActions.map((action, index) => (
              <Card 
                key={`admin-${index}`}
                className="bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-smooth cursor-pointer group"
                onClick={() => onNavigate?.(action.action)}
              >
                <CardHeader className="text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-lg bg-muted/50 group-hover:bg-muted flex items-center justify-center transition-smooth">
                    <action.icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Analytics Dashboard</h2>
        <AnalyticsCharts />
      </div>

      {/* Recent Activity */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Created TOS for "Software Engineering"</p>
              <p className="text-xs text-muted-foreground">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-secondary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Added 15 new questions to database</p>
              <p className="text-xs text-muted-foreground">Yesterday</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <div className="flex-1">
              <p className="text-sm font-medium">Generated midterm exam</p>
              <p className="text-xs text-muted-foreground">3 days ago</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin-specific section */}
      {userRole === 'admin' && (
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              System Overview (Admin)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">47</div>
                <p className="text-sm text-muted-foreground">Active Teachers</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">1,234</div>
                <p className="text-sm text-muted-foreground">Approved Questions</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">23</div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">89</div>
                <p className="text-sm text-muted-foreground">Tests Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};