import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Database, 
  TrendingUp,
  Settings,
  PieChart as PieIcon,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(30, 80%, 55%)",
  "hsl(350, 65%, 50%)",
  "hsl(160, 60%, 45%)",
  "hsl(45, 80%, 50%)",
];

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
      const [questionsRes, teachersRes, testsRes] = await Promise.all([
        supabase.from('questions').select('*', { count: 'exact' }),
        supabase.from('user_roles').select('*', { count: 'exact' }).eq('role', 'teacher'),
        supabase.from('generated_tests').select('*', { count: 'exact' })
      ]);
      return {
        totalQuestions: questionsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        totalTests: testsRes.count || 0
      };
    }
  });

  const { data: teacherDistribution } = useQuery({
    queryKey: ['teacher-distribution'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('college');
      
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');
      
      const teacherIds = new Set(teacherRoles?.map(r => r.user_id) || []);
      const collegeCounts: Record<string, number> = {};
      
      profiles?.forEach(p => {
        if (teacherIds.has(p.college ? '' : '') || teacherIds.size > 0) {
          // Check if this profile is a teacher
        }
        const college = p.college || 'Unassigned';
        collegeCounts[college] = (collegeCounts[college] || 0) + 1;
      });

      // Filter to only teachers
      const { data: teacherProfiles } = await supabase
        .from('profiles')
        .select('id, college');
      
      const teacherCollegeCounts: Record<string, number> = {};
      teacherProfiles?.forEach(p => {
        if (teacherIds.has(p.id)) {
          const college = p.college || 'Unassigned';
          teacherCollegeCounts[college] = (teacherCollegeCounts[college] || 0) + 1;
        }
      });

      return Object.entries(teacherCollegeCounts).map(([name, value]) => ({ name, value }));
    }
  });

  const { data: categoryDistribution } = useQuery({
    queryKey: ['category-distribution'],
    queryFn: async () => {
      const { data: questions } = await supabase
        .from('questions')
        .select('category')
        .eq('deleted', false);
      
      const counts: Record<string, number> = {};
      questions?.forEach(q => {
        const cat = q.category || 'Uncategorized';
        counts[cat] = (counts[cat] || 0) + 1;
      });

      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }
  });

  const { data: cognitiveDistribution } = useQuery({
    queryKey: ['cognitive-distribution'],
    queryFn: async () => {
      const { data: questions } = await supabase
        .from('questions')
        .select('bloom_level')
        .eq('deleted', false);
      
      const counts: Record<string, number> = {};
      questions?.forEach(q => {
        const level = q.bloom_level || 'Unknown';
        counts[level] = (counts[level] || 0) + 1;
      });

      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }
  });

  const { data: sourceDistribution } = useQuery({
    queryKey: ['source-distribution'],
    queryFn: async () => {
      const { data: questions } = await supabase
        .from('questions')
        .select('created_by, owner')
        .eq('deleted', false);
      
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      const adminIds = new Set(adminRoles?.map(r => r.user_id) || []);
      
      let adminCount = 0;
      let teacherCount = 0;
      
      questions?.forEach(q => {
        const userId = q.owner || q.created_by;
        if (userId && adminIds.has(userId)) {
          adminCount++;
        } else {
          teacherCount++;
        }
      });

      return [
        { name: 'Admin', count: adminCount },
        { name: 'Teachers', count: teacherCount },
      ];
    }
  });

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const chartConfig = {
    value: { label: "Count" },
    count: { label: "Questions" },
  };

  const renderPieLabel = ({ name, percent }: { name: string; percent: number }) => 
    percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : '';

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
            <CardTitle className="text-sm font-medium">Tests Generated</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTests || 0}</div>
            <p className="text-xs text-muted-foreground">Total created</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">Good</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Teacher Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="h-5 w-5" />
              Teacher Distribution by College
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {teacherDistribution && teacherDistribution.length > 0 ? (
              <ChartContainer config={chartConfig} className="w-full h-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={teacherDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={renderPieLabel}>
                    {teacherDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Question Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="h-5 w-5" />
              Question Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {categoryDistribution && categoryDistribution.length > 0 ? (
              <ChartContainer config={chartConfig} className="w-full h-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={categoryDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={renderPieLabel}>
                    {categoryDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Cognitive Domain Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="h-5 w-5" />
              Cognitive Domain Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {cognitiveDistribution && cognitiveDistribution.length > 0 ? (
              <ChartContainer config={chartConfig} className="w-full h-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={cognitiveDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={renderPieLabel}>
                    {cognitiveDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Question Source Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Question Source (Admin vs Teachers)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {sourceDistribution && sourceDistribution.some(d => d.count > 0) ? (
              <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart data={sourceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    <Cell fill="hsl(var(--primary))" />
                    <Cell fill="hsl(var(--accent))" />
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
