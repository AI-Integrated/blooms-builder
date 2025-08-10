import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  GraduationCap, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  Search,
  Filter,
  Download,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RubricScoring } from './RubricScoring';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  topic: string;
  bloom_level: string;
  difficulty: string;
}

interface QuestionRubric {
  id: string;
  title: string;
  description: string;
  total_points: number;
  criteria: Array<{
    id: string;
    criterion_name: string;
    description: string;
    max_points: number;
    order_index: number;
  }>;
}

interface StudentResponse {
  id: string;
  question_id: string;
  student_name: string;
  student_id?: string;
  response_text: string;
  submitted_at: string;
  graded: boolean;
  total_score: number;
  graded_by?: string;
  graded_at?: string;
}

interface EssayGradingInterfaceProps {
  onBack: () => void;
}

export const EssayGradingInterface: React.FC<EssayGradingInterfaceProps> = ({ onBack }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [rubrics, setRubrics] = useState<Record<string, QuestionRubric>>({});
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [selectedResponse, setSelectedResponse] = useState<StudentResponse | null>(null);
  const [showScoring, setShowScoring] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load essay/short answer questions
      const { data: questionsData, error: questionsError } = await (supabase as any)
        .from('questions')
        .select('*')
        .in('question_type', ['essay', 'short_answer'])
        .eq('approved', true);

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Load rubrics for these questions
      const questionIds = (questionsData || []).map(q => q.id);
      if (questionIds.length > 0) {
        const { data: rubricsData, error: rubricsError } = await (supabase as any)
          .from('question_rubrics')
          .select(`
            *,
            criteria:rubric_criteria(*)
          `)
          .in('question_id', questionIds);

        if (rubricsError) throw rubricsError;

        const rubricsMap: Record<string, QuestionRubric> = {};
        (rubricsData || []).forEach(rubric => {
          rubricsMap[rubric.question_id] = {
            id: rubric.id,
            title: rubric.title,
            description: rubric.description,
            total_points: rubric.total_points,
            criteria: rubric.criteria.sort((a, b) => a.order_index - b.order_index)
          };
        });
        setRubrics(rubricsMap);
      }

      // Load student responses
      const { data: responsesData, error: responsesError } = await (supabase as any)
        .from('student_responses')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load grading data');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreSubmit = async (criterionScores: any[], totalScore: number) => {
    setShowScoring(false);
    setSelectedResponse(null);
    await loadData(); // Refresh data
    toast.success('Response graded successfully!');
  };

  const filteredResponses = responses.filter(response => {
    const matchesQuestion = !selectedQuestion || response.question_id === selectedQuestion;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'graded' && response.graded) ||
                         (filterStatus === 'ungraded' && !response.graded);
    const matchesSearch = !searchTerm || 
                         response.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         response.response_text.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesQuestion && matchesStatus && matchesSearch;
  });

  const getQuestionById = (questionId: string) => {
    return questions.find(q => q.id === questionId);
  };

  const getResponseStats = () => {
    const total = responses.length;
    const graded = responses.filter(r => r.graded).length;
    const ungraded = total - graded;
    const avgScore = graded > 0 
      ? responses.filter(r => r.graded).reduce((sum, r) => sum + r.total_score, 0) / graded 
      : 0;

    return { total, graded, ungraded, avgScore };
  };

  const stats = getResponseStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading grading interface...</p>
        </div>
      </div>
    );
  }

  if (showScoring && selectedResponse) {
    const question = getQuestionById(selectedResponse.question_id);
    const rubric = rubrics[selectedResponse.question_id];
    
    if (!question || !rubric) {
      toast.error('Question or rubric not found');
      setShowScoring(false);
      return null;
    }

    return (
      <div className="min-h-screen bg-background">
        <div className="container-custom section-padding">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setShowScoring(false)}>
              ← Back to Responses
            </Button>
          </div>
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Grading: {question.question_text}</h2>
            <div className="flex gap-2">
              <Badge variant="outline">{question.topic}</Badge>
              <Badge variant="outline">{question.bloom_level}</Badge>
              <Badge variant="outline">{question.difficulty}</Badge>
            </div>
          </div>

          <RubricScoring
            rubric={rubric}
            response={selectedResponse}
            onScoreSubmit={handleScoreSubmit}
            onCancel={() => setShowScoring(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom section-padding">
        {/* Header */}
        <div className="text-center mb-16 animate-slide-in-down">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Essay Grading</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            Rubric-Based <span className="text-shimmer">Grading</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Grade essay and short answer responses using comprehensive rubrics for fair and consistent evaluation
          </p>
          <Button variant="outline" onClick={onBack} className="interactive focus-ring">
            ← Back to Dashboard
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 animate-slide-in-up stagger-1">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold text-primary mb-1">
                {stats.total}
              </div>
              <div className="text-sm text-muted-foreground">Total Responses</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
              </div>
              <div className="text-3xl font-bold text-green-500 mb-1">
                {stats.graded}
              </div>
              <div className="text-sm text-muted-foreground">Graded</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border-yellow-500/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-500/20 rounded-xl">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
              <div className="text-3xl font-bold text-yellow-500 mb-1">
                {stats.ungraded}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-secondary/20 rounded-xl">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
              </div>
              <div className="text-3xl font-bold text-secondary mb-1">
                {stats.avgScore.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Avg. Score</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-card mb-8 animate-slide-in-up stagger-2">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students or responses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
                <SelectTrigger>
                  <SelectValue placeholder="All Questions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Questions</SelectItem>
                  {questions.map((question) => (
                    <SelectItem key={question.id} value={question.id}>
                      {question.question_text.substring(0, 50)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="ungraded">Ungraded</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedQuestion("");
                  setFilterStatus("all");
                }}
                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 focus-ring"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Responses List */}
        <div className="space-y-6 animate-slide-in-up stagger-3">
          {filteredResponses.length === 0 ? (
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 animate-fade-in-scale">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No responses found</h3>
                <p className="text-muted-foreground">
                  {responses.length === 0 
                    ? "No student responses have been submitted yet."
                    : "Try adjusting your search criteria."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredResponses.map((response) => {
              const question = getQuestionById(response.question_id);
              const rubric = rubrics[response.question_id];
              
              if (!question) return null;

              return (
                <Card key={response.id} className="bg-card/80 backdrop-blur-sm border border-border/50 card-hover">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">{response.student_name}</h3>
                          {response.student_id && (
                            <Badge variant="outline">{response.student_id}</Badge>
                          )}
                          <Badge variant={response.graded ? "default" : "secondary"}>
                            {response.graded ? "Graded" : "Pending"}
                          </Badge>
                          {response.graded && (
                            <Badge variant="outline">
                              {response.total_score} / {rubric?.total_points || 0} pts
                            </Badge>
                          )}
                        </div>

                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Question:</strong> {question.question_text}
                          </p>
                          <div className="flex gap-2 mb-3">
                            <Badge variant="outline">{question.topic}</Badge>
                            <Badge variant="outline">{question.bloom_level}</Badge>
                            <Badge variant="outline">{question.difficulty}</Badge>
                          </div>
                        </div>

                        <div className="bg-muted/30 p-4 rounded-lg border mb-4">
                          <p className="text-sm text-muted-foreground mb-2">Student Response:</p>
                          <p className="whitespace-pre-wrap">
                            {response.response_text.length > 200 
                              ? `${response.response_text.substring(0, 200)}...`
                              : response.response_text
                            }
                          </p>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Submitted: {new Date(response.submitted_at).toLocaleString()}
                          {response.graded && response.graded_at && (
                            <span className="ml-4">
                              Graded: {new Date(response.graded_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {rubric ? (
                          <Button
                            onClick={() => {
                              setSelectedResponse(response);
                              setShowScoring(true);
                            }}
                            variant={response.graded ? "outline" : "default"}
                            size="sm"
                            className="interactive focus-ring"
                          >
                            {response.graded ? "Re-grade" : "Grade"}
                          </Button>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            No Rubric
                          </Badge>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="interactive focus-ring"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Quick Actions */}
        <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-card mt-8">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <Button variant="outline" className="interactive focus-ring">
                <Download className="w-4 h-4 mr-2" />
                Export Grades (CSV)
              </Button>
              <Button variant="outline" className="interactive focus-ring">
                <FileText className="w-4 h-4 mr-2" />
                Generate Grade Report
              </Button>
              <Button variant="outline" className="interactive focus-ring">
                <Users className="w-4 h-4 mr-2" />
                Student Feedback Summary
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};