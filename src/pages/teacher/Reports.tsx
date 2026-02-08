import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { TopicCoverageChart } from '@/components/reports/TopicCoverageChart';

export default function Reports() {
  const { data: stats } = useQuery({
    queryKey: ['report-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { testsGenerated: 0, totalQuestions: 0 };

      const { data: tests, count } = await supabase
        .from('generated_tests')
        .select('items', { count: 'exact' })
        .eq('created_by', user.id);

      // Calculate total questions across all tests
      let totalQuestions = 0;
      (tests || []).forEach(test => {
        const items = Array.isArray(test.items) ? test.items : [];
        totalQuestions += items.length;
      });

      return {
        testsGenerated: count || 0,
        totalQuestions
      };
    }
  });

  return (
    <div className="container mx-auto py-6 px-4 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Usage Reports</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Analyze your test generation and usage statistics
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Tests Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.testsGenerated || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total questionnaires created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              Total Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalQuestions || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all generated tests</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Avg. Questions per Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.testsGenerated && stats.testsGenerated > 0 
                ? Math.round(stats.totalQuestions / stats.testsGenerated) 
                : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average test length</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Topic Coverage</CardTitle>
          <CardDescription>Distribution of questions by topic across your generated tests</CardDescription>
        </CardHeader>
        <CardContent>
          <TopicCoverageChart />
        </CardContent>
      </Card>
    </div>
  );
}
