import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, Download, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePDFExport } from '@/hooks/usePDFExport';

interface TestItem {
  id?: number;
  question: string;
  type: string;
  options?: string[];
  correctAnswer?: string | number;
  points?: number;
  difficulty?: string;
  bloom_level?: string;
  topic?: string;
}

export default function TestPreview() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { exportTestQuestions } = usePDFExport();
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (testId) {
      fetchTest();
    }
  }, [testId]);

  const fetchTest = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (error) throw error;
      setTest(data);
    } catch (error) {
      console.error('Error fetching test:', error);
      toast({
        title: 'Error',
        description: 'Failed to load test',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async () => {
    if (!test?.items) return;
    const success = await exportTestQuestions(test.items, test.title || 'Test');
    if (success) {
      toast({
        title: 'Success',
        description: 'Test exported successfully',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Test not found</p>
            <Button className="mt-4" onClick={() => navigate('/teacher/my-tests')}>
              Back to Tests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items: TestItem[] = Array.isArray(test.items) ? test.items : [];
  const totalPoints = items.reduce((sum, item) => sum + (item.points || 1), 0);

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-500/10 text-green-500';
      case 'average':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'difficult':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/teacher/my-tests')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tests
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Test Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{test.title || 'Untitled Test'}</CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            {test.subject && <Badge variant="secondary">{test.subject}</Badge>}
            {test.course && <Badge variant="secondary">{test.course}</Badge>}
            {test.exam_period && <Badge variant="secondary">{test.exam_period}</Badge>}
            {test.school_year && <Badge variant="secondary">{test.school_year}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{items.length}</div>
              <div className="text-sm text-muted-foreground">Total Questions</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{totalPoints}</div>
              <div className="text-sm text-muted-foreground">Total Points</div>
            </div>
            {test.time_limit && (
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{test.time_limit}</div>
                <div className="text-sm text-muted-foreground">Minutes</div>
              </div>
            )}
            {test.version_label && (
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{test.version_label}</div>
                <div className="text-sm text-muted-foreground">Version</div>
              </div>
            )}
          </div>

          {test.instructions && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Instructions</h3>
              <p className="text-sm text-muted-foreground">{test.instructions}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No questions in this test</p>
          ) : (
            items.map((item, index) => (
              <div key={item.id || index} className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">
                        Q{index + 1}
                      </Badge>
                      {item.difficulty && (
                        <Badge className={getDifficultyColor(item.difficulty)}>
                          {item.difficulty}
                        </Badge>
                      )}
                      {item.bloom_level && (
                        <Badge variant="secondary">{item.bloom_level}</Badge>
                      )}
                      {item.topic && (
                        <Badge variant="secondary">{item.topic}</Badge>
                      )}
                      {item.points && (
                        <Badge variant="outline">{item.points} pts</Badge>
                      )}
                    </div>
                    <p className="text-base leading-relaxed">{item.question}</p>
                    
                    {item.type === 'multiple-choice' && item.options && (
                      <div className="mt-3 space-y-2 ml-6">
                        {item.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-start gap-2">
                            <span className="text-muted-foreground font-mono">
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            <span>{option}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {index < items.length - 1 && <Separator className="mt-6" />}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Answer Key */}
      {test.answer_key && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Answer Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {items.map((item, index) => (
                <div key={item.id || index} className="p-3 bg-muted rounded-lg text-center">
                  <div className="text-sm text-muted-foreground">Q{index + 1}</div>
                  <div className="font-mono font-bold text-primary">
                    {item.correctAnswer !== undefined ? item.correctAnswer : '—'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
