import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  FileText, 
  Settings, 
  Eye, 
  Save, 
  Share2,
  Shuffle,
  Target,
  Clock
} from 'lucide-react';
import { useCollaborativeEditing } from '@/hooks/useCollaborativeEditing';
import { CollaborationIndicator } from './CollaborationIndicator';
import { CollaborativeDocumentManager } from './CollaborativeDocumentManager';
import { RealtimeActivityFeed } from './RealtimeActivityFeed';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  topic: string;
  bloom_level: string;
  difficulty: string;
  choices?: Record<string, string>;
  correct_answer?: string;
}

interface TestConfiguration {
  title: string;
  subject: string;
  course: string;
  year_section: string;
  exam_period: string;
  school_year: string;
  instructions: string;
  time_limit: number;
  points_per_question: number;
  shuffle_questions: boolean;
  shuffle_choices: boolean;
  number_of_versions: number;
  selected_questions: string[];
}

interface CollaborativeTestBuilderProps {
  onBack: () => void;
}

export const CollaborativeTestBuilder: React.FC<CollaborativeTestBuilderProps> = ({ onBack }) => {
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [testConfig, setTestConfig] = useState<TestConfiguration>({
    title: '',
    subject: '',
    course: '',
    year_section: '',
    exam_period: '',
    school_year: '',
    instructions: 'Read each question carefully and select the best answer.',
    time_limit: 60,
    points_per_question: 1,
    shuffle_questions: true,
    shuffle_choices: true,
    number_of_versions: 3,
    selected_questions: []
  });
  const [loading, setLoading] = useState(true);
  const [showCollaboration, setShowCollaboration] = useState(false);

  const documentId = `test-builder-${Date.now()}`;
  
  const {
    users,
    isConnected,
    currentUser,
    broadcastChange
  } = useCollaborativeEditing({
    documentId,
    documentType: 'test',
    initialData: testConfig,
    onDataChange: (data) => {
      if (data) {
        setTestConfig(data);
      }
    }
  });

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('questions')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field: keyof TestConfiguration, value: any) => {
    const updatedConfig = { ...testConfig, [field]: value };
    setTestConfig(updatedConfig);
    broadcastChange(updatedConfig);
  };

  const handleQuestionToggle = (questionId: string, isSelected: boolean) => {
    const updatedQuestions = isSelected
      ? [...testConfig.selected_questions, questionId]
      : testConfig.selected_questions.filter(id => id !== questionId);
    
    handleConfigChange('selected_questions', updatedQuestions);
  };

  const selectedQuestions = availableQuestions.filter(q => 
    testConfig.selected_questions.includes(q.id)
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom section-padding">
        {/* Header */}
        <div className="text-center mb-16 animate-slide-in-down">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Collaborative Test Building</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            Build Tests <span className="text-shimmer">Together</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Collaborate in real-time to create comprehensive assessments with your teaching team
          </p>
          <Button variant="outline" onClick={onBack} className="interactive focus-ring">
            ← Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    Collaborative Test Builder
                  </div>
                  <div className="flex items-center gap-2">
                    <CollaborationIndicator 
                      users={users}
                      isConnected={isConnected}
                      currentUser={currentUser}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCollaboration(!showCollaboration)}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </CardTitle>
                {showCollaboration && (
                  <div className="mt-4">
                    <CollaborativeDocumentManager
                      documentId={documentId}
                      documentType="test"
                      documentTitle={testConfig.title || "Untitled Test"}
                      currentUserEmail="teacher@example.com"
                      isOwner={true}
                    />
                  </div>
                )}
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="config" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="config">Configuration</TabsTrigger>
                    <TabsTrigger value="questions">Select Questions</TabsTrigger>
                    <TabsTrigger value="preview">Preview & Export</TabsTrigger>
                  </TabsList>

                  {/* Configuration Tab */}
                  <TabsContent value="config" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Test Title</Label>
                        <Input
                          id="title"
                          value={testConfig.title}
                          onChange={(e) => handleConfigChange('title', e.target.value)}
                          placeholder="e.g., Midterm Examination"
                        />
                      </div>
                      <div>
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          value={testConfig.subject}
                          onChange={(e) => handleConfigChange('subject', e.target.value)}
                          placeholder="e.g., System Analysis and Design"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="course">Course</Label>
                        <Input
                          id="course"
                          value={testConfig.course}
                          onChange={(e) => handleConfigChange('course', e.target.value)}
                          placeholder="e.g., BSIS"
                        />
                      </div>
                      <div>
                        <Label htmlFor="yearSection">Year & Section</Label>
                        <Input
                          id="yearSection"
                          value={testConfig.year_section}
                          onChange={(e) => handleConfigChange('year_section', e.target.value)}
                          placeholder="e.g., 3A"
                        />
                      </div>
                      <div>
                        <Label htmlFor="examPeriod">Exam Period</Label>
                        <Input
                          id="examPeriod"
                          value={testConfig.exam_period}
                          onChange={(e) => handleConfigChange('exam_period', e.target.value)}
                          placeholder="e.g., Final"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="instructions">Instructions</Label>
                      <Textarea
                        id="instructions"
                        value={testConfig.instructions}
                        onChange={(e) => handleConfigChange('instructions', e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                        <Input
                          id="timeLimit"
                          type="number"
                          value={testConfig.time_limit}
                          onChange={(e) => handleConfigChange('time_limit', parseInt(e.target.value) || 60)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="pointsPerQuestion">Points per Question</Label>
                        <Input
                          id="pointsPerQuestion"
                          type="number"
                          value={testConfig.points_per_question}
                          onChange={(e) => handleConfigChange('points_per_question', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="numberOfVersions">Number of Versions</Label>
                        <Select 
                          value={testConfig.number_of_versions.toString()} 
                          onValueChange={(value) => handleConfigChange('number_of_versions', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Version</SelectItem>
                            <SelectItem value="2">2 Versions (A, B)</SelectItem>
                            <SelectItem value="3">3 Versions (A, B, C)</SelectItem>
                            <SelectItem value="4">4 Versions (A, B, C, D)</SelectItem>
                            <SelectItem value="5">5 Versions (A, B, C, D, E)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-lg font-semibold">Version Options</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="shuffleQuestions"
                            checked={testConfig.shuffle_questions}
                            onCheckedChange={(checked) => handleConfigChange('shuffle_questions', checked)}
                          />
                          <Label htmlFor="shuffleQuestions" className="cursor-pointer">
                            Shuffle question order between versions
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="shuffleChoices"
                            checked={testConfig.shuffle_choices}
                            onCheckedChange={(checked) => handleConfigChange('shuffle_choices', checked)}
                          />
                          <Label htmlFor="shuffleChoices" className="cursor-pointer">
                            Shuffle answer choices (MCQ only)
                          </Label>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Questions Selection Tab */}
                  <TabsContent value="questions" className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold">Select Questions</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedQuestions.length} questions selected
                        </p>
                      </div>
                      <Badge variant="outline">
                        Total Points: {selectedQuestions.length * testConfig.points_per_question}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {loading ? (
                        <div className="space-y-3">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                          ))}
                        </div>
                      ) : (
                        availableQuestions.map((question) => {
                          const isSelected = testConfig.selected_questions.includes(question.id);
                          return (
                            <Card 
                              key={question.id} 
                              className={`transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border/50'}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleQuestionToggle(question.id, checked as boolean)}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <p className="font-medium mb-2">{question.question_text}</p>
                                    <div className="flex flex-wrap gap-2">
                                      <Badge variant="outline">{question.topic}</Badge>
                                      <Badge variant="outline">{question.bloom_level}</Badge>
                                      <Badge variant="outline">{question.difficulty}</Badge>
                                      <Badge variant="secondary">{question.question_type}</Badge>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </TabsContent>

                  {/* Preview Tab */}
                  <TabsContent value="preview" className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Test Preview</h3>
                      <p className="text-muted-foreground mb-4">
                        Review your test configuration before generating versions
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card className="p-4">
                          <div className="text-2xl font-bold text-primary">{selectedQuestions.length}</div>
                          <div className="text-sm text-muted-foreground">Questions</div>
                        </Card>
                        <Card className="p-4">
                          <div className="text-2xl font-bold text-secondary">{testConfig.number_of_versions}</div>
                          <div className="text-sm text-muted-foreground">Versions</div>
                        </Card>
                        <Card className="p-4">
                          <div className="text-2xl font-bold text-accent">
                            {selectedQuestions.length * testConfig.points_per_question}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Points</div>
                        </Card>
                      </div>

                      <Button 
                        size="lg"
                        className="bg-gradient-primary hover:shadow-glow btn-hover"
                        disabled={selectedQuestions.length === 0 || !testConfig.title.trim()}
                      >
                        <Shuffle className="w-5 h-5 mr-2" />
                        Generate {testConfig.number_of_versions} Test Versions
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Activity Feed */}
            <RealtimeActivityFeed
              documentId={documentId}
              documentType="test"
              maxItems={8}
            />

            {/* Quick Stats */}
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Available Questions</span>
                  <Badge variant="outline">{availableQuestions.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Selected Questions</span>
                  <Badge variant="default">{selectedQuestions.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Test Versions</span>
                  <Badge variant="secondary">{testConfig.number_of_versions}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Time Limit</span>
                  <Badge variant="outline">{testConfig.time_limit}m</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Collaboration Status */}
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" />
                  Collaboration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={isConnected ? "default" : "destructive"}>
                      {isConnected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Users</span>
                    <Badge variant="outline">{users.length}</Badge>
                  </div>
                  {currentUser && (
                    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded border border-primary/20">
                      <div className="h-6 w-6 rounded-full text-xs text-white flex items-center justify-center" style={{ backgroundColor: currentUser.color }}>
                        {currentUser.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{currentUser.name}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};