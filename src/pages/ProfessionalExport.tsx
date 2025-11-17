import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileDown, FileText, FileCode, Package } from 'lucide-react';
import { ExportWizard } from '@/export/ExportWizard';
import { ReportGenerator } from '@/export/ReportGenerator';
import { LaTeXPreview } from '@/export/LaTeXPreview';
import { TemplateSelector, type TemplateConfig } from '@/export/TemplateSelector';
import { generateLaTeX } from '@/services/export/latexGenerator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ProfessionalExport() {
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [latexCode, setLatexCode] = useState('');
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>({
    template: 'standard',
    paperSize: 'letter',
    includeHeader: true,
    includeFooter: true,
    includeTOS: false,
    includeAnswerKey: false
  });

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('generated_tests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTests(data || []);
      
      if (data && data.length > 0) {
        setSelectedTest(data[0]);
      }
    } catch (error) {
      console.error('Error loading tests:', error);
      toast.error('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLaTeX = () => {
    if (!selectedTest) {
      toast.error('No test selected');
      return;
    }

    try {
      const questions = selectedTest.items || [];
      const metadata = {
        title: selectedTest.title,
        subject: selectedTest.subject,
        course: selectedTest.course,
        year_section: selectedTest.year_section,
        exam_period: selectedTest.exam_period,
        school_year: selectedTest.school_year,
        instructions: selectedTest.instructions
      };

      const latex = generateLaTeX(questions, metadata, {
        documentClass: 'exam',
        fontSize: '12pt',
        paperSize: 'a4paper',
        includeAnswerKey: templateConfig.includeAnswerKey
      });

      setLatexCode(latex);
      toast.success('LaTeX code generated');
    } catch (error) {
      console.error('Error generating LaTeX:', error);
      toast.error('Failed to generate LaTeX');
    }
  };

  const handleDownloadLaTeX = () => {
    if (!latexCode) {
      toast.error('Generate LaTeX first');
      return;
    }

    const blob = new Blob([latexCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTest?.title.replace(/\s+/g, '_') || 'test'}.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Professional Export & Documentation</h1>
        <p className="text-muted-foreground">
          Export tests in multiple formats with professional templates
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Available Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for export</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Export Formats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground mt-1">PDF, LaTeX, DOCX</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground mt-1">Professional styles</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Selected Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">
              {selectedTest?.title || 'None'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedTest ? `${(selectedTest.items || []).length} questions` : 'Select a test'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Test Selection */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-muted-foreground">Loading tests...</div>
          </CardContent>
        </Card>
      ) : tests.length === 0 ? (
        <Alert>
          <AlertDescription>
            No tests available. Generate tests first before exporting.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Test to Export</CardTitle>
              <CardDescription>Choose a test from your generated tests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tests.map(test => (
                  <div
                    key={test.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTest?.id === test.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedTest(test)}
                  >
                    <h4 className="font-medium mb-1">{test.title}</h4>
                    <p className="text-sm text-muted-foreground">{test.subject}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                        {(test.items || []).length} questions
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                        {test.version_label || 'V1'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          {selectedTest && (
            <Tabs defaultValue="pdf">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pdf">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF Export
                </TabsTrigger>
                <TabsTrigger value="latex">
                  <FileCode className="h-4 w-4 mr-2" />
                  LaTeX Export
                </TabsTrigger>
                <TabsTrigger value="report">
                  <Package className="h-4 w-4 mr-2" />
                  Report Generator
                </TabsTrigger>
                <TabsTrigger value="templates">
                  <FileDown className="h-4 w-4 mr-2" />
                  Templates
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pdf" className="mt-6">
                <ExportWizard
                  questions={selectedTest.items || []}
                  metadata={{
                    title: selectedTest.title,
                    subject: selectedTest.subject,
                    course: selectedTest.course,
                    year_section: selectedTest.year_section,
                    exam_period: selectedTest.exam_period,
                    school_year: selectedTest.school_year,
                    instructor: 'Teacher',
                    time_limit: selectedTest.time_limit,
                    total_points: selectedTest.points_per_question * (selectedTest.items || []).length,
                    instructions: selectedTest.instructions
                  }}
                />
              </TabsContent>

              <TabsContent value="latex" className="mt-6">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>LaTeX Export Options</CardTitle>
                      <CardDescription>
                        Generate LaTeX source for academic publishing
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Button onClick={handleGenerateLaTeX}>
                          <FileCode className="h-4 w-4 mr-2" />
                          Generate LaTeX
                        </Button>
                        {latexCode && (
                          <Button variant="outline" onClick={handleDownloadLaTeX}>
                            <FileDown className="h-4 w-4 mr-2" />
                            Download .tex File
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {latexCode && (
                    <LaTeXPreview
                      latexCode={latexCode}
                      onDownload={handleDownloadLaTeX}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="report" className="mt-6">
                <ReportGenerator
                  testData={selectedTest}
                  tosData={null}
                  psychometricData={null}
                  complianceData={null}
                />
              </TabsContent>

              <TabsContent value="templates" className="mt-6">
                <TemplateSelector
                  config={templateConfig}
                  onConfigChange={setTemplateConfig}
                />
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
      </div>
  );
}
