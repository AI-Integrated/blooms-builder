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
import { ExamPrintView } from '@/components/print/ExamPrintView';

interface TestItem {
  id?: string | number;
  question?: string;
  question_text?: string;
  type?: string;
  question_type?: string;
  options?: string[];
  choices?: Record<string, string> | string[];
  correctAnswer?: string | number;
  correct_answer?: string | number;
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

  // Helper to get question text from various field names
  const getQuestionText = (item: TestItem): string => {
    return item.question_text || item.question || '';
  };

  // Helper to get question type
  const getQuestionType = (item: TestItem): string => {
    return (item.question_type || item.type || '').toLowerCase();
  };

  // Helper to get correct answer
  const getCorrectAnswer = (item: TestItem): string | number | undefined => {
    return item.correct_answer ?? item.correctAnswer;
  };

  // Helper to get MCQ options from various formats
  const getMCQOptions = (item: TestItem): { key: string; text: string }[] => {
    const choices = item.choices || item.options;
    if (!choices) return [];
    
    // Handle object format {A: "...", B: "...", C: "...", D: "..."}
    if (typeof choices === 'object' && !Array.isArray(choices)) {
      return ['A', 'B', 'C', 'D']
        .filter(key => choices[key])
        .map(key => ({ key, text: choices[key] as string }));
    }
    
    // Handle array format ["option1", "option2", ...]
    if (Array.isArray(choices)) {
      return choices.map((text, idx) => ({
        key: String.fromCharCode(65 + idx),
        text: String(text)
      }));
    }
    
    return [];
  };

  return (
    <>
      {/* Screen View */}
      <div className="container mx-auto py-4 sm:py-8 px-4 space-y-6 screen-only">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button variant="outline" onClick={() => navigate('/teacher/my-tests')} size="sm" className="sm:size-default">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tests
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handlePrint} className="flex-1 sm:flex-none">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleExport} className="flex-1 sm:flex-none">
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
            items.map((item, index) => {
              const questionText = getQuestionText(item);
              const questionType = getQuestionType(item);
              const mcqOptions = getMCQOptions(item);
              const correctAnswer = getCorrectAnswer(item);
              const isMCQ = questionType === 'mcq' || questionType === 'multiple-choice' || questionType === 'multiple_choice';
              
              return (
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
                      <p className="text-base leading-relaxed">{questionText}</p>
                      
                      {isMCQ && mcqOptions.length > 0 && (
                        <div className="mt-3 space-y-2 ml-6">
                          {mcqOptions.map((option) => {
                            const isCorrect = correctAnswer === option.key || correctAnswer === option.key.toLowerCase();
                            return (
                              <div 
                                key={option.key} 
                                className={`flex items-start gap-2 p-2 rounded ${isCorrect ? 'bg-green-50 border border-green-300' : ''}`}
                              >
                                <span className="text-muted-foreground font-mono font-medium">
                                  {option.key}.
                                </span>
                                <span className="text-sm">{option.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* True/False */}
                      {(questionType === 'true_false' || questionType === 'true-false' || questionType === 'truefalse') && (
                        <div className="flex gap-4 mt-3 ml-6">
                          <div className={`px-4 py-2 rounded border ${String(correctAnswer).toLowerCase() === 'true' ? 'bg-green-50 border-green-300' : ''}`}>
                            True
                          </div>
                          <div className={`px-4 py-2 rounded border ${String(correctAnswer).toLowerCase() === 'false' ? 'bg-green-50 border-green-300' : ''}`}>
                            False
                          </div>
                        </div>
                      )}

                      {/* Short Answer / Fill in the Blank */}
                      {(questionType === 'short_answer' || questionType === 'fill-blank' || questionType === 'fill_blank' || questionType === 'identification') && (
                        <div className="mt-3 ml-6 p-2 bg-muted rounded">
                          <span className="text-sm text-muted-foreground">Answer: </span>
                          <span className="font-medium">{correctAnswer || '—'}</span>
                        </div>
                      )}

                      {/* Essay */}
                      {questionType === 'essay' && (
                        <div className="mt-3 ml-6 border-t border-dashed pt-2 text-sm text-muted-foreground italic">
                          Essay response required
                        </div>
                      )}
                    </div>
                  </div>
                  {index < items.length - 1 && <Separator className="mt-6" />}
                </div>
              );
            })
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
              {items.map((item, index) => {
                const answer = getCorrectAnswer(item);
                return (
                  <div key={item.id || index} className="p-3 bg-muted rounded-lg text-center">
                    <div className="text-sm text-muted-foreground">Q{index + 1}</div>
                    <div className="font-mono font-bold text-primary">
                      {answer !== undefined ? String(answer) : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      </div>

      {/* Print View - Hidden on screen, shown when printing */}
      <ExamPrintView test={test} showAnswerKey={true} />
    </>
  );
}
