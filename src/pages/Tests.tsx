
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Plus, Users, Key, GitCompare, Share2, Eye } from "lucide-react";
import { toast } from "sonner";
import { GeneratedTests } from "@/services/db/generatedTests";
import { TestVersionComparison } from "@/components/TestVersionComparison";
import { TestVersionAnswerKey } from "@/components/TestVersionAnswerKey";
import { TestDistribution } from "@/components/tests/TestDistribution";
import { RealTimeCollaborationPanel } from "@/components/RealTimeCollaborationPanel";

const Tests = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'comparison' | 'distribution' | 'answerkey' | 'collaboration'>('list');
  const [selectedVersions, setSelectedVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const data = await GeneratedTests.list();
      setTests(data);
    } catch (error) {
      console.error('Error loading tests:', error);
      toast.error('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const getTestGroups = () => {
    const groups: Record<string, any[]> = {};
    tests.forEach(test => {
      const key = `${test.title}-${test.subject}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(test);
    });
    return groups;
  };

  const handleViewComparison = async (baseTitle: string, subject: string) => {
    try {
      const versions = await GeneratedTests.listByBaseTest(baseTitle, subject);
      if (versions.length < 2) {
        toast.error('At least 2 versions required for comparison');
        return;
      }
      
      const versionsData = versions.map(v => ({
        version_label: v.version_label || 'A',
        questions: Array.isArray(v.items) ? v.items : [],
        answer_key: v.answer_key || {},
        total_points: Array.isArray(v.items) ? v.items.length : 0
      }));
      
      setSelectedVersions(versionsData);
      setViewMode('comparison');
    } catch (error) {
      console.error('Error loading versions:', error);
      toast.error('Failed to load test versions');
    }
  };

  const handleViewAnswerKey = (test: any) => {
    const versionData = {
      version_label: test.version_label || 'A',
      questions: Array.isArray(test.items) ? test.items : [],
      answer_key: test.answer_key || {},
      total_points: Array.isArray(test.items) ? test.items.length : 0
    };
    setSelectedVersion(versionData);
    setSelectedTest(test);
    setViewMode('answerkey');
  };

  const handleViewDistribution = (test: any) => {
    setSelectedTest(test);
    setViewMode('distribution');
  };

  const testGroups = getTestGroups();

  if (viewMode === 'comparison' && selectedVersions.length > 0) {
    return (
      <div className="animate-slide-up space-y-6">
        <Button variant="outline" onClick={() => setViewMode('list')}>
          ← Back to Tests
        </Button>
        <TestVersionComparison 
          versions={selectedVersions}
          originalQuestions={selectedVersions[0]?.questions || []}
        />
      </div>
    );
  }

  if (viewMode === 'answerkey' && selectedVersion) {
    return (
      <div className="animate-slide-up space-y-6">
        <Button variant="outline" onClick={() => setViewMode('list')}>
          ← Back to Tests
        </Button>
        <TestVersionAnswerKey
          version={selectedVersion}
          testTitle={selectedTest?.title || 'Test'}
          subject={selectedTest?.subject || 'Subject'}
          onClose={() => setViewMode('list')}
        />
      </div>
    );
  }

  if (viewMode === 'distribution' && selectedTest) {
    return (
      <div className="animate-slide-up">
        <TestDistribution
          parentTestId={selectedTest.id}
          onBack={() => setViewMode('list')}
        />
      </div>
    );
  }

  if (viewMode === 'collaboration') {
    return (
      <div className="animate-slide-up space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Real-Time Collaboration</h2>
            <p className="text-muted-foreground">Collaborate with other teachers on test creation</p>
          </div>
          <Button variant="outline" onClick={() => setViewMode('list')}>
            ← Back to Tests
          </Button>
        </div>
        <Card className="p-6">
          <p className="text-muted-foreground">Collaboration features will be integrated here for multi-user test editing.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Test Management</h2>
          <p className="text-muted-foreground">
            Manage versions, distribute tests, and collaborate with teachers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setViewMode('collaboration')}>
            <Share2 className="mr-2 h-4 w-4" />
            Collaborate
          </Button>
          <Button onClick={() => window.location.href = '/test-assembly'}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Test
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Loading tests...
          </CardContent>
        </Card>
      ) : Object.keys(testGroups).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No tests yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first test to get started
            </p>
            <Button onClick={() => window.location.href = '/test-assembly'}>
              <Plus className="mr-2 h-4 w-4" />
              Generate Test
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(testGroups).map(([key, versions]) => {
            const baseTest = versions[0];
            const hasMultipleVersions = versions.length > 1;

            return (
              <Card key={key} className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {baseTest.title}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {baseTest.subject} • {baseTest.course || 'General Course'}
                      </CardDescription>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary">
                          {versions.length} {versions.length === 1 ? 'Version' : 'Versions'}
                        </Badge>
                        <Badge variant="outline">
                          {Array.isArray(baseTest.items) ? baseTest.items.length : 0} Questions
                        </Badge>
                        {baseTest.time_limit && (
                          <Badge variant="outline">
                            {baseTest.time_limit} minutes
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <Tabs defaultValue="versions" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="versions">Versions</TabsTrigger>
                      <TabsTrigger value="actions">Actions</TabsTrigger>
                    </TabsList>

                    <TabsContent value="versions" className="space-y-3 mt-4">
                      {versions.map(version => (
                        <div
                          key={version.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-background/50"
                        >
                          <div className="flex items-center gap-3">
                            <Badge className="text-base px-3 py-1">
                              Version {version.version_label}
                            </Badge>
                            <div className="text-sm text-muted-foreground">
                              Created {new Date(version.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewAnswerKey(version)}
                          >
                            <Key className="h-4 w-4 mr-2" />
                            Answer Key
                          </Button>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="actions" className="space-y-3 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {hasMultipleVersions && (
                          <Button
                            variant="outline"
                            className="h-auto flex-col py-4"
                            onClick={() => handleViewComparison(baseTest.title, baseTest.subject)}
                          >
                            <GitCompare className="h-5 w-5 mb-2" />
                            <span className="font-medium">Compare Versions</span>
                            <span className="text-xs text-muted-foreground mt-1">
                              Analyze differences
                            </span>
                          </Button>
                        )}
                        
                        {hasMultipleVersions && (
                          <Button
                            variant="outline"
                            className="h-auto flex-col py-4"
                            onClick={() => handleViewDistribution(baseTest)}
                          >
                            <Users className="h-5 w-5 mb-2" />
                            <span className="font-medium">Distribute Tests</span>
                            <span className="text-xs text-muted-foreground mt-1">
                              Assign to students
                            </span>
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          className="h-auto flex-col py-4"
                          onClick={() => {
                            toast.info('Opening test preview...');
                          }}
                        >
                          <Eye className="h-5 w-5 mb-2" />
                          <span className="font-medium">Preview Test</span>
                          <span className="text-xs text-muted-foreground mt-1">
                            View all versions
                          </span>
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Tests;
