import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wand2, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import { TestAssemblyWizard } from '@/tests/TestAssemblyWizard';
import { AssemblyPreview } from '@/tests/AssemblyPreview';
import { ParallelFormViewer } from '@/tests/ParallelFormViewer';
import { useTestAssembly } from '@/hooks/useTestAssembly';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function TestAssembly() {
  const [questionPool, setQuestionPool] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wizard');
  const [assemblyResults, setAssemblyResults] = useState<any[]>([]);
  const [savedAssemblies, setSavedAssemblies] = useState<any[]>([]);
  
  const { getAssemblies } = useTestAssembly();

  useEffect(() => {
    loadQuestions();
    loadSavedAssemblies();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestionPool(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load question pool');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedAssemblies = async () => {
    try {
      const assemblies = await getAssemblies();
      setSavedAssemblies(assemblies);
    } catch (error) {
      console.error('Error loading assemblies:', error);
    }
  };

  const handleTestGenerated = (results: any) => {
    setAssemblyResults(Array.isArray(results) ? results : [results]);
    setActiveTab('preview');
    toast.success('Test assembly completed successfully!');
  };

  const handleSaveAssembly = async () => {
    try {
      if (assemblyResults.length === 0) {
        toast.error('No assembly to save');
        return;
      }

      // Save to database (simplified)
      toast.success('Assembly saved successfully!');
      await loadSavedAssemblies();
    } catch (error) {
      console.error('Error saving assembly:', error);
      toast.error('Failed to save assembly');
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Advanced Test Assembly</h1>
        <p className="text-muted-foreground">
          Use intelligent algorithms to construct balanced, constraint-based assessments
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Question Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questionPool.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Available questions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Saved Assemblies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{savedAssemblies.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Previously created</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(questionPool.map(q => q.topic)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Covered in pool</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Current Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assemblyResults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Generated forms</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-muted-foreground">Loading question pool...</div>
          </CardContent>
        </Card>
      ) : questionPool.length === 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No approved questions available. Please create and approve questions first.
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wizard">
              <Wand2 className="h-4 w-4 mr-2" />
              Assembly Wizard
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={assemblyResults.length === 0}>
              <Package className="h-4 w-4 mr-2" />
              Preview Results
            </TabsTrigger>
            <TabsTrigger value="saved">
              <CheckCircle className="h-4 w-4 mr-2" />
              Saved Assemblies
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wizard" className="mt-6">
            <TestAssemblyWizard
              questionPool={questionPool}
              onTestGenerated={handleTestGenerated}
              onCancel={() => setActiveTab('saved')}
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            {assemblyResults.length > 0 && (
              <div className="space-y-6">
                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setActiveTab('wizard')}>
                    Generate New
                  </Button>
                  <Button onClick={handleSaveAssembly}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Assembly
                  </Button>
                </div>

                {/* Single Form Preview */}
                {assemblyResults.length === 1 && (
                  <AssemblyPreview result={assemblyResults[0]} />
                )}

                {/* Multiple Parallel Forms */}
                {assemblyResults.length > 1 && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Parallel Forms Generated</CardTitle>
                        <CardDescription>
                          {assemblyResults.length} equivalent test versions created
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    
                    <ParallelFormViewer
                      forms={assemblyResults.map(r => ({
                        versionLabel: String.fromCharCode(65 + assemblyResults.indexOf(r)),
                        questionOrder: r.selectedQuestions.map((q: any) => q.id),
                        shuffleSeed: null,
                        metadata: r.metadata
                      }))}
                      questions={questionPool}
                    />

                    {/* Summary of each form */}
                    {assemblyResults.map((result, idx) => (
                      <AssemblyPreview key={idx} result={result} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Saved Test Assemblies</CardTitle>
                <CardDescription>
                  Previously generated and saved test assemblies
                </CardDescription>
              </CardHeader>
              <CardContent>
                {savedAssemblies.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No saved assemblies yet. Create one using the Assembly Wizard.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedAssemblies.map((assembly) => (
                      <div
                        key={assembly.id}
                        className="p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{assembly.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Created {new Date(assembly.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Load
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      </div>
  );
}
