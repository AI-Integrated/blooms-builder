import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Wand2, Loader2, Eye, CheckCircle, AlertCircle, Download, FileText, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IntelligentQuestionSelector } from '@/services/ai/intelligentSelector';
import { autoGenerator } from '@/services/ai/autoGenerator';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePDFExport } from '@/hooks/usePDFExport';

interface TOSRequirement {
  topic: string;
  bloomLevel: string;
  difficulty: string;
  count: number;
}

export default function IntelligentTestGenerator() {
  const [testName, setTestName] = useState('');
  const [selectedTOS, setSelectedTOS] = useState<string>('');
  const [tosList, setTosList] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<TOSRequirement[]>([
    { topic: '', bloomLevel: 'remember', difficulty: 'easy', count: 5 }
  ]);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { exportTestQuestions } = usePDFExport();

  useEffect(() => {
    fetchTOSList();
  }, []);

  const fetchTOSList = async () => {
    try {
      const { data, error } = await supabase
        .from('tos_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTosList(data || []);
    } catch (error) {
      console.error('Error fetching TOS:', error);
    }
  };

  const loadTOSRequirements = async (tosId: string) => {
    try {
      const { data, error } = await supabase
        .from('learning_competencies')
        .select('*')
        .eq('tos_id', tosId);

      if (error) throw error;

      const tosRequirements: TOSRequirement[] = [];
      data?.forEach((comp: any) => {
        ['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'].forEach(level => {
          const count = comp[`${level}_items`] || 0;
          if (count > 0) {
            tosRequirements.push({
              topic: comp.topic_name,
              bloomLevel: level,
              difficulty: 'medium',
              count: count
            });
          }
        });
      });

      setRequirements(tosRequirements);
      toast({
        title: 'TOS Loaded',
        description: `Loaded ${tosRequirements.length} requirements from TOS`,
      });
    } catch (error) {
      console.error('Error loading TOS:', error);
      toast({
        title: 'Error',
        description: 'Failed to load TOS requirements',
        variant: 'destructive',
      });
    }
  };

  const addRequirement = () => {
    setRequirements([...requirements, { topic: '', bloomLevel: 'remember', difficulty: 'easy', count: 5 }]);
  };

  const updateRequirement = (index: number, field: keyof TOSRequirement, value: string | number) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    setRequirements(updated);
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const handleGenerateCompleteTest = async () => {
    if (!testName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a test name',
        variant: 'destructive',
      });
      return;
    }

    if (requirements.length === 0 || requirements.some(r => !r.topic.trim())) {
      toast({
        title: 'Error',
        description: 'Please add at least one valid requirement',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      const { generateTestFromTOS } = await import('@/services/ai/testGenerationService');
      
      // Convert requirements to proper format
      const tosRequirements = requirements.map(r => ({
        topic: r.topic,
        bloom_level: r.bloomLevel,
        difficulty: r.difficulty,
        count: r.count
      }));

      // Get TOS metadata if a TOS is selected
      let tosMetadata: any = {
        subject: '',
        course: '',
        year_section: '',
        exam_period: '',
        school_year: '',
        tos_id: selectedTOS || undefined
      };

      if (selectedTOS) {
        const { data: tosData } = await supabase
          .from('tos_entries')
          .select('*')
          .eq('id', selectedTOS)
          .single();
        
        if (tosData) {
          tosMetadata = {
            subject: tosData.subject_no || '',
            course: tosData.course || '',
            year_section: tosData.year_section || '',
            exam_period: tosData.exam_period || '',
            school_year: tosData.school_year || '',
            tos_id: selectedTOS
          };
        }
      }

      // 🧠 EXECUTE COMPLETE AI FALLBACK ALGORITHM
      console.log("🚀 Starting Complete Test Generation with AI Fallback...");
      
      const result = await generateTestFromTOS(
        tosRequirements,
        testName,
        tosMetadata
      );

      // Show generation results
      toast({
        title: '✓ Test Generated',
        description: `Created test with ${result.questions.length} questions`,
      });

      // STEP 5: Redirect to GeneratedTestPage
      console.log(`✅ Redirecting to /teacher/preview-test/${result.id}`);
      navigate(`/teacher/preview-test/${result.id}`);

    } catch (error: any) {
      console.error('❌ Test generation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate test. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!testName.trim()) {
      toast({ title: 'Error', description: 'Please enter a test name', variant: 'destructive' });
      return;
    }

    if (requirements.some(r => !r.topic.trim())) {
      toast({ title: 'Error', description: 'All requirements must have a topic', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const selector = new IntelligentQuestionSelector();
      const tosRequirements = requirements.map(r => ({
        topic: r.topic,
        bloom_level: r.bloomLevel,
        difficulty: r.difficulty,
        count: r.count
      }));
      
      const result = await selector.selectQuestions(tosRequirements, user.id);

      // Generate missing questions using AI
      if (result.missingRequirements.length > 0) {
        const generationRequests = result.missingRequirements.map(req => ({
          requirement: req,
          teacherId: user.id,
          tosId: selectedTOS || ''
        }));

        const generationResults = await autoGenerator.generateMissingQuestions(generationRequests);
        
        toast({
          title: 'AI Generation',
          description: `Generated ${generationResults.filter(r => r.success).length} new questions. Pending admin approval.`,
        });
      }

      setPreview({
        selectedQuestions: result.selectedQuestions,
        missingRequirements: result.missingRequirements,
        totalQuestions: result.selectedQuestions.length,
        aiGenerated: result.missingRequirements.reduce((sum, r) => sum + r.count, 0)
      });
      setShowPreview(true);

      toast({
        title: 'Preview Generated',
        description: `Found ${result.selectedQuestions.length} questions`,
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate preview',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!preview) return;

    setExporting(true);
    try {
      const questions = preview.selectedQuestions.map((q: any) => ({
        question: q.question_text,
        type: q.question_type === 'mcq' ? 'multiple-choice' : 'essay',
        options: q.choices ? Object.values(q.choices) : [],
        correctAnswer: q.correct_answer
      }));

      const result = await exportTestQuestions(questions, testName, false);
      
      if (result) {
        toast({
          title: 'Success',
          description: 'Test exported to PDF',
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to export test',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleSaveFinalTest = async () => {
    if (!preview) return;

    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const questionItems = preview.selectedQuestions.map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        choices: q.choices,
        correct_answer: q.correct_answer,
        bloom_level: q.bloom_level,
        difficulty: q.difficulty,
        topic: q.topic
      }));

      const { data: test, error: testError } = await supabase
        .from('generated_tests')
        .insert([{
          title: testName,
          created_by: user.id,
          tos_id: selectedTOS || null,
          items: questionItems as any,
          answer_key: questionItems.map((q, i) => ({
            number: i + 1,
            answer: q.correct_answer
          })) as any
        }])
        .select()
        .single();

      if (testError) throw testError;

      toast({
        title: 'Success',
        description: `Test saved with ${questionItems.length} questions`,
      });

      navigate('/teacher/my-tests');
    } catch (error) {
      console.error('Error saving test:', error);
      toast({
        title: 'Error',
        description: 'Failed to save test',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  if (showPreview && preview) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-6 w-6" />
              Test Preview: {testName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{preview.totalQuestions}</div>
                  <div className="text-sm text-muted-foreground">Questions Selected</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <Wand2 className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{preview.aiGenerated}</div>
                  <div className="text-sm text-muted-foreground">AI Generated (Pending)</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{preview.missingRequirements.length}</div>
                  <div className="text-sm text-muted-foreground">Missing Requirements</div>
                </div>
              </Card>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Selected Questions</h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor="answer-key-toggle" className="text-sm">Show Answer Key</Label>
                  <Switch
                    id="answer-key-toggle"
                    checked={showAnswerKey}
                    onCheckedChange={setShowAnswerKey}
                  />
                </div>
              </div>

              {preview.selectedQuestions.map((q: any, idx: number) => (
                <Card key={q.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">#{idx + 1}</Badge>
                        <Badge variant="outline">{q.topic}</Badge>
                        <Badge variant="outline">{q.bloom_level}</Badge>
                        <Badge variant="outline">{q.difficulty}</Badge>
                      </div>
                      
                      <p className="text-sm font-medium">{q.question_text}</p>
                      
                      {q.question_type === 'mcq' && q.choices && (
                        <div className="ml-4 space-y-1">
                          {Object.entries(q.choices as Record<string, string>).map(([key, value]) => (
                            <div 
                              key={key} 
                              className={`text-sm ${
                                showAnswerKey && key === q.correct_answer
                                  ? 'text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {key}. {String(value)}
                              {showAnswerKey && key === q.correct_answer && ' ✓'}
                            </div>
                          ))}
                        </div>
                      )}

                      {showAnswerKey && q.question_type !== 'mcq' && (
                        <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                          <p className="text-sm text-green-800 dark:text-green-300">
                            <strong>Answer:</strong> {q.correct_answer || 'See rubric for grading criteria'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {preview.missingRequirements.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    Missing Requirements (AI Generated - Pending Approval)
                  </h3>
                  {preview.missingRequirements.map((req: any, idx: number) => (
                    <div key={idx} className="text-sm text-muted-foreground">
                      • {req.count} {req.bloom_level} questions on {req.topic} ({req.difficulty})
                    </div>
                  ))}
                </div>
              </>
            )}

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                Back to Edit
              </Button>
              <Button
                variant="secondary"
                onClick={handleExportPDF}
                disabled={exporting || preview.totalQuestions === 0}
              >
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </>
                )}
              </Button>
              <Button
                onClick={handleSaveFinalTest}
                disabled={generating || preview.totalQuestions === 0}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save Final Test
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-6 w-6" />
            AI-Powered Test Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="testName">Test Name</Label>
            <Input
              id="testName"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g., Midterm Exam - Chapter 5"
            />
          </div>

          <div>
            <Label htmlFor="tosSelect">Load from Table of Specifications (Optional)</Label>
            <div className="flex gap-2">
              <Select value={selectedTOS} onValueChange={(value) => {
                setSelectedTOS(value);
                loadTOSRequirements(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a TOS..." />
                </SelectTrigger>
                <SelectContent>
                  {tosList.map((tos) => (
                    <SelectItem key={tos.id} value={tos.id}>
                      {tos.title || `TOS - ${new Date(tos.created_at).toLocaleDateString()}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Test Requirements</Label>
              <Button variant="outline" size="sm" onClick={addRequirement}>
                Add Requirement
              </Button>
            </div>

            {requirements.map((req, index) => (
              <Card key={index} className="p-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <Label>Topic</Label>
                    <Input
                      value={req.topic}
                      onChange={(e) => updateRequirement(index, 'topic', e.target.value)}
                      placeholder="e.g., Photosynthesis"
                    />
                  </div>
                  <div>
                    <Label>Bloom's Level</Label>
                    <Select
                      value={req.bloomLevel}
                      onValueChange={(value) => updateRequirement(index, 'bloomLevel', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remember">Remember</SelectItem>
                        <SelectItem value="understand">Understand</SelectItem>
                        <SelectItem value="apply">Apply</SelectItem>
                        <SelectItem value="analyze">Analyze</SelectItem>
                        <SelectItem value="evaluate">Evaluate</SelectItem>
                        <SelectItem value="create">Create</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    <Select
                      value={req.difficulty}
                      onValueChange={(value) => updateRequirement(index, 'difficulty', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Count</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={req.count}
                        onChange={(e) => updateRequirement(index, 'count', parseInt(e.target.value))}
                      />
                      {requirements.length > 1 && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeRequirement(index)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleGeneratePreview}
              disabled={generating}
              className="w-full"
              size="lg"
              variant="outline"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Generate Preview
                </>
              )}
            </Button>

            <Button
              onClick={handleGenerateCompleteTest}
              disabled={generating || !testName.trim() || requirements.some(r => !r.topic.trim())}
              className="w-full"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Test...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Complete Test from TOS
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
