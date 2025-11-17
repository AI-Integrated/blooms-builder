import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface GeneratedTest {
  id: string;
  title: string | null;
  created_at: string;
  items: any;
}

export default function MyTests() {
  const [tests, setTests] = useState<GeneratedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchMyTests();
  }, []);

  const fetchMyTests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('generated_tests')
        .select('id, title, created_at, items')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedTests: GeneratedTest[] = (data || []).map(test => ({
        id: test.id,
        title: test.title,
        created_at: test.created_at || '',
        items: test.items
      }));
      
      setTests(mappedTests);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your tests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Generated Tests</h1>
        <Button onClick={() => navigate('/teacher/generate-test')}>
          Generate New Test
        </Button>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tests generated yet</p>
            <Button
              className="mt-4"
              onClick={() => navigate('/teacher/generate-test')}
            >
              Create Your First Test
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => (
            <Card key={test.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {test.title || 'Untitled Test'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(test.created_at).toLocaleDateString()}
                  </div>
                  <div>{Array.isArray(test.items) ? test.items.length : 0} questions</div>
                </div>
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => navigate(`/teacher/test/${test.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Test
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
