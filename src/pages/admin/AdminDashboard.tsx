import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PendingQuestionsPanel } from "@/components/admin/PendingQuestionsPanel";
import { 
  Users, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  FileText,
  Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useUserRole();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/teacher/dashboard");
    }
  }, [isAdmin, loading, navigate]);

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [questionsRes, teachersRes, pendingRes, generationLogsRes] = await Promise.all([
        supabase.from('questions').select('*', { count: 'exact' }),
        supabase.from('user_roles').select('*', { count: 'exact' }).eq('role', 'teacher'),
        supabase.from('questions').select('*', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('ai_generation_logs').select('*', { count: 'exact' })
      ]);

      return {
        totalQuestions: questionsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        pendingApprovals: pendingRes.count || 0,
        aiGenerations: generationLogsRes.count || 0
      };
    }
  });

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">System management and oversight</p>
          </div>
          <Button onClick={() => navigate("/admin/settings")}>
            <Settings className="h-4 w-4 mr-2" />
            System Settings
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalQuestions || 0}</div>
              <p className="text-xs text-muted-foreground">In question bank</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teachers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTeachers || 0}</div>
              <p className="text-xs text-muted-foreground">Active users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingApprovals || 0}</div>
              <p className="text-xs text-muted-foreground">Require review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Generations</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.aiGenerations || 0}</div>
              <p className="text-xs text-muted-foreground">Total created</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Questions Panel - High Priority */}
        <PendingQuestionsPanel />

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="cursor-pointer hover:bg-accent" onClick={() => navigate("/admin/question-bank")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Question Bank
              </CardTitle>
              <CardDescription>Manage master question repository</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent" onClick={() => navigate("/admin/approvals")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Review Approvals
              </CardTitle>
              <CardDescription>Review pending AI-generated questions</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent" onClick={() => navigate("/admin/teachers")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Manage Teachers
              </CardTitle>
              <CardDescription>View and manage teacher accounts</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent" onClick={() => navigate("/admin/analytics")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                System Analytics
              </CardTitle>
              <CardDescription>View performance metrics</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent" onClick={() => navigate("/admin/ai-logs")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AI Generation Logs
              </CardTitle>
              <CardDescription>Monitor AI activity</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
  );
}