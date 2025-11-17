import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, FileText, BarChart3, Upload } from 'lucide-react';
import { StandardsPanel } from '@/components/curriculum/StandardsPanel';
import { OutcomeMapper } from '@/components/curriculum/OutcomeMapper';
import { ComplianceReport } from '@/components/curriculum/ComplianceReport';
import { OutcomeAlignmentDashboard } from '@/components/curriculum/OutcomeAlignmentDashboard';
import { useStandards } from '@/hooks/useStandards';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CurriculumStandards() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [complianceReport, setComplianceReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const {
    standards,
    searchStandards,
    analyzeTestAlignment,
    getComplianceReport,
    isLoading: standardsLoading
  } = useStandards();

  useEffect(() => {
    loadQuestions();
    searchStandards();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateComplianceReport = async () => {
    try {
      const questionIds = questions.map(q => q.id);
      const report = await getComplianceReport(questionIds, standards);
      setComplianceReport(report);
      toast.success('Compliance report generated');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate compliance report');
    }
  };

  const handleAnalyzeAlignment = async () => {
    try {
      const questionIds = questions.map(q => q.id);
      await analyzeTestAlignment(questionIds);
    } catch (error) {
      console.error('Error analyzing alignment:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Curriculum Standards Integration</h1>
        <p className="text-muted-foreground">
          Map assessments to educational standards and validate alignment
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Standards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{standards.length}</div>
            <p className="text-xs text-muted-foreground mt-1">In database</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for mapping</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Frameworks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(standards.map(s => s.framework).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Different frameworks</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Mapped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground mt-1">Questions mapped</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="browse">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="browse">
            <BookOpen className="h-4 w-4 mr-2" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="mapping">
            <FileText className="h-4 w-4 mr-2" />
            Map Questions
          </TabsTrigger>
          <TabsTrigger value="alignment">
            <BarChart3 className="h-4 w-4 mr-2" />
            Outcome Alignment
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <BarChart3 className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-6">
          <StandardsPanel />
        </TabsContent>

        <TabsContent value="mapping" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Question Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Question to Map</CardTitle>
                <CardDescription>
                  Choose a question to map to curriculum standards
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading questions...
                  </div>
                ) : questions.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No questions available. Create questions first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {questions.map(question => (
                      <div
                        key={question.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedQuestion?.id === question.id
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedQuestion(question)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium line-clamp-2">
                              {question.question_text}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                                {question.bloom_level}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                                {question.topic}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Outcome Mapper */}
            {selectedQuestion && (
              <OutcomeMapper
                questionId={selectedQuestion.id}
                questionText={selectedQuestion.question_text}
                bloomLevel={selectedQuestion.bloom_level}
                subjectArea={selectedQuestion.topic}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="alignment" className="mt-6">
          <OutcomeAlignmentDashboard 
            questions={questions}
            onRefresh={loadQuestions}
          />
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Analysis</CardTitle>
                <CardDescription>
                  Generate reports on standards alignment and coverage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateComplianceReport}
                    disabled={standardsLoading || questions.length === 0}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Compliance Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleAnalyzeAlignment}
                    disabled={standardsLoading || questions.length === 0}
                  >
                    Analyze Alignment
                  </Button>
                </div>
                {questions.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      No questions available for compliance analysis
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Compliance Report */}
            {complianceReport && (
              <ComplianceReport report={complianceReport} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Standards</CardTitle>
              <CardDescription>
                Import educational standards from CSV or JSON files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Standards import functionality coming soon. Contact your administrator to add standards manually.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
