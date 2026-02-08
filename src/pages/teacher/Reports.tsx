import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function Reports() {
  const { data: stats } = useQuery({
    queryKey: ['report-stats'],
    queryFn: async () => {
      const testsRes = await supabase.from('generated_tests').select('*', { count: 'exact' });
      return {
        testsGenerated: testsRes.count || 0
      };
    }
  });

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Usage Reports</h1>
        <p className="text-muted-foreground">
          Analyze your test generation and usage statistics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Tests Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.testsGenerated || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">This semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground mt-1">Test completion</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Topic Coverage</CardTitle>
          <CardDescription>Distribution of questions by topic</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
            Topic distribution chart will be implemented here
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
