import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  PlusCircle, 
  Clock, 
  Download,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { isTeacher, loading, role } = useUserRole();

  useEffect(() => {
    if (!loading && !isTeacher) {
      navigate("/auth");
    }
  }, [isTeacher, loading, navigate]);

  const { data: stats } = useQuery({
    queryKey: ['teacher-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [testsRes, recentRes] = await Promise.all([
        supabase.from('generated_tests').select('*', { count: 'exact' }),
        supabase.from('generated_tests').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

      return {
        totalTests: testsRes.count || 0,
        recentTests: recentRes.data || []
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
            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
            <p className="text-muted-foreground">Create and manage your tests</p>
          </div>
          <Button onClick={() => navigate("/teacher/generate-test")} size="lg">
            <PlusCircle className="h-5 w-5 mr-2" />
            Generate New Test
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tests Generated</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTests || 0}</div>
              <p className="text-xs text-muted-foreground">Total questionnaires</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent" onClick={() => navigate("/teacher/tos")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                TOS Management
              </CardTitle>
              <CardDescription>Create table of specifications</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent" onClick={() => navigate("/teacher/history")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Test History
              </CardTitle>
              <CardDescription>View past tests</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* AI-Assisted Generation Feature */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Assisted Test Generation
            </CardTitle>
            <CardDescription>
              Generate tests automatically from your Table of Specifications. 
              The system will intelligently select or create non-redundant questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/teacher/generate-test")} className="w-full">
              Start Generating
            </Button>
          </CardContent>
        </Card>

        {/* Recent Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tests</CardTitle>
            <CardDescription>Your recently generated questionnaires</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentTests && stats.recentTests.length > 0 ? (
              <div className="space-y-2">
                {stats.recentTests.map((test: any) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => navigate(`/teacher/test/${test.id}`)}
                  >
                    <div>
                      <p className="font-medium">{test.title || 'Untitled Test'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(test.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No tests generated yet. Create your first test!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}