import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Sparkles,
  Upload,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Questions, ActivityLog } from '@/services/db';
import BulkImport from './BulkImport';
import { QuestionForm } from './QuestionForm';
import { useRealtime } from '@/hooks/useRealtime';
import { usePresence } from '@/hooks/usePresence';
import { supabase } from '@/integrations/supabase/client';

interface Question {
  id: string;
  text: string;
  type: 'Multiple Choice' | 'Essay' | 'True/False' | 'Fill in the Blank';
  topic: string;
  bloomLevel: string;
  difficulty: 'Easy' | 'Average' | 'Difficult';
  options?: string[];
  correctAnswer?: string;
  createdBy: 'teacher' | 'ai';
  approved: boolean;
  confidenceScore?: number;
  needsReview?: boolean;
}

interface QuestionBankProps {
  onBack: () => void;
}

export const QuestionBank = ({ onBack }: QuestionBankProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedBloomLevel, setSelectedBloomLevel] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedApprovalStatus, setSelectedApprovalStatus] =
    useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    aiGenerated: 0,
    teacherCreated: 0,
  });
  const [realtimeStatus, setRealtimeStatus] = useState<string>('Connecting...');

  // Real-time collaboration
  const { users: collaborators, isConnected } = usePresence('question-bank', {
    name: 'Current User', // Should come from auth context
    email: 'user@example.com' // Should come from auth context
  });

  // Remove duplicate realtime subscription since useRealtimeQuestions already handles this
  // useRealtime('question-bank-updates', {
  //   table: 'questions',
  //   onInsert: (newQuestion) => {
  //     toast.info(`New question added by collaborator: "${newQuestion.question_text.substring(0, 50)}..."`);
  //     fetchQuestions();
  //   },
  //   onUpdate: (updatedQuestion) => {
  //     toast.info(`Question updated by collaborator`);
  //     fetchQuestions();
  //   },
  //   onDelete: (deletedQuestion) => {
  //     toast.info(`Question deleted by collaborator`);
  //     fetchQuestions();
  //   }
  // });

  useEffect(() => {
    setRealtimeStatus(isConnected ? 'Connected' : 'Disconnected');
  }, [isConnected]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [
    selectedTopic,
    selectedBloomLevel,
    selectedDifficulty,
    selectedApprovalStatus,
    searchTerm,
  ]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      // Fetch questions with current filters
      const data = await Questions.search({
        approved:
          selectedApprovalStatus === 'approved'
            ? true
            : selectedApprovalStatus === 'pending'
            ? false
            : undefined,
        topic:
          selectedTopic && selectedTopic !== 'all' ? selectedTopic : undefined,
        bloom_level:
          selectedBloomLevel && selectedBloomLevel !== 'all'
            ? selectedBloomLevel
            : undefined,
        difficulty:
          selectedDifficulty && selectedDifficulty !== 'all'
            ? selectedDifficulty
            : undefined,
      });

      const transformedQuestions: Question[] = data.map((q) => {
        // Normalize difficulty to allowed values
        const normalizeDifficulty = (
          value: string | null
        ): Question['difficulty'] => {
          switch ((value || '').toLowerCase()) {
            case 'easy':
              return 'Easy';
            case 'difficult':
              return 'Difficult';
            default:
              return 'Average'; // default
          }
        };

        // Normalize type
        let type: Question['type'];
        if (q.question_type === 'mcq') {
          type = 'Multiple Choice';
        } else if (q.question_type === 'true_false') {
          type = 'True/False';
        } else if (q.question_type === 'short_answer') {
          type = 'Fill in the Blank';
        } else {
          type = 'Essay';
        }

        return {
          id: q.id,
          text: q.question_text || 'Untitled Question',
          type,
          topic: q.topic || 'General',
          bloomLevel: q.bloom_level
            ? q.bloom_level.charAt(0).toUpperCase() + q.bloom_level.slice(1)
            : 'Unknown',
          difficulty: normalizeDifficulty(q.difficulty),
          options: q.choices ? Object.values(q.choices) : undefined,
          correctAnswer: q.correct_answer || undefined,
          createdBy:
            q.created_by === 'bulk_import' || q.created_by === 'ai'
              ? 'ai'
              : 'teacher',
          approved: !!q.approved,
          confidenceScore: q.ai_confidence_score || undefined,
          needsReview: !!q.needs_review,
        };
      });

      setQuestions(transformedQuestions);

      // Calculate stats
      const newStats = {
        total: transformedQuestions.length,
        approved: transformedQuestions.filter((q) => q.approved).length,
        pending: transformedQuestions.filter((q) => !q.approved).length,
        aiGenerated: transformedQuestions.filter((q) => q.createdBy === 'ai')
          .length,
        teacherCreated: transformedQuestions.filter(
          (q) => q.createdBy === 'teacher'
        ).length,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const topics = [
    'Requirements Engineering',
    'Data and Process Modeling',
    'Object Modeling & Development',
  ];
  const bloomLevels = [
    'Remembering',
    'Understanding',
    'Applying',
    'Analyzing',
    'Evaluating',
    'Creating',
  ];

  const filteredQuestions = questions.filter((question) => {
    return (
      (searchTerm === '' ||
        question.text.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedTopic === '' ||
        selectedTopic === 'all' ||
        question.topic === selectedTopic) &&
      (selectedBloomLevel === '' ||
        selectedBloomLevel === 'all' ||
        question.bloomLevel === selectedBloomLevel) &&
      (selectedDifficulty === '' ||
        selectedDifficulty === 'all' ||
        question.difficulty === selectedDifficulty) &&
      (selectedApprovalStatus === 'all' ||
        (selectedApprovalStatus === 'approved' && question.approved) ||
        (selectedApprovalStatus === 'pending' && !question.approved))
    );
  });

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setShowAddForm(false);
    fetchQuestions(); // Refresh the list
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setShowAddForm(true);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await Questions.delete(questionId);

      // Log deletion activity
      await ActivityLog.log('delete_question', 'question');

      toast.success('Question deleted successfully!');

      await fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const handleToggleApproval = async (
    questionId: string,
    currentStatus: boolean
  ) => {
    try {
      const updatedQuestion = await Questions.toggleApproval(
        questionId,
        !currentStatus,
        !currentStatus ? 'Approved by teacher review' : 'Approval revoked by teacher'
      );

      toast.success(!currentStatus ? 'Question approved!' : 'Approval revoked');
      
      // Update local state immediately for better UX
      setQuestions(prev => prev.map(q => 
        q.id === questionId 
          ? { ...q, approved: !currentStatus }
          : q
      ));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        approved: !currentStatus ? prev.approved + 1 : prev.approved - 1,
        pending: !currentStatus ? prev.pending - 1 : prev.pending + 1
      }));
    } catch (error) {
      console.error('Error toggling approval:', error);
      toast.error('Failed to update question approval');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom section-padding">
        {/* Animated Header */}
        <div className="text-center mb-16 animate-slide-in-down">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
            <Brain className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">
              Intelligent Question Management
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            Question <span className="text-shimmer">Bank</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Organize, categorize, and manage your questions with AI-powered
            insights
          </p>
          <Button
            variant="outline"
            onClick={onBack}
            className="interactive focus-ring"
          >
            ← Back to Dashboard
          </Button>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 animate-slide-in-up stagger-1">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold text-primary mb-1">
                {stats.total}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Questions
              </div>
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
                {stats.approved}
              </div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-secondary/20 rounded-xl">
                  <Clock className="w-6 h-6 text-secondary" />
                </div>
              </div>
              <div className="text-3xl font-bold text-secondary mb-1">
                {stats.pending}
              </div>
              <div className="text-sm text-muted-foreground">
                Pending Review
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent/20 rounded-xl">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
              </div>
              <div className="text-3xl font-bold text-accent mb-1">
                {stats.aiGenerated}
              </div>
              <div className="text-sm text-muted-foreground">AI Generated</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500/20 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-orange-500" />
                </div>
              </div>
              <div className="text-3xl font-bold text-orange-500 mb-1">
                {stats.teacherCreated}
              </div>
              <div className="text-sm text-muted-foreground">
                Teacher Created
              </div>
            </CardContent>
          </Card>
        </div>

        {showBulkImport ? (
          <BulkImport
            onClose={() => setShowBulkImport(false)}
            onImportComplete={fetchQuestions}
          />
        ) : showAddForm ? (
          <QuestionForm
            onSave={handleAddQuestion}
            onCancel={() => {
              setShowAddForm(false);
              setEditingQuestion(null);
            }}
            existingQuestion={editingQuestion}
          />
        ) : (
          <>
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-8 animate-slide-in-up stagger-2">
              <h2 className="text-2xl font-bold text-foreground">
                Questions Library
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={fetchQuestions}
                  variant="outline"
                  className="interactive focus-ring"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={() => setShowBulkImport(true)}
                  variant="outline"
                  className="interactive focus-ring"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Import
                </Button>
                <Button
                  onClick={() => {
                    setEditingQuestion(null);
                    setShowAddForm(true);
                  }}
                  className="bg-gradient-primary hover:shadow-glow btn-hover interactive focus-ring"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>

            {/* Enhanced Filters */}
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-card animate-slide-in-up stagger-3">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search questions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select
                    value={selectedTopic}
                    onValueChange={setSelectedTopic}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Topics" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Topics</SelectItem>
                      {topics.map((topic) => (
                        <SelectItem key={topic} value={topic}>
                          {topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedBloomLevel}
                    onValueChange={setSelectedBloomLevel}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Bloom Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Bloom Levels</SelectItem>
                      {bloomLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedDifficulty}
                    onValueChange={setSelectedDifficulty}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Average">Average</SelectItem>
                      <SelectItem value="Difficult">Difficult</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedApprovalStatus}
                    onValueChange={setSelectedApprovalStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="approved">Approved Only</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedTopic('all');
                      setSelectedBloomLevel('all');
                      setSelectedDifficulty('all');
                      setSelectedApprovalStatus('all');
                    }}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 focus-ring"
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Questions List */}
            <div className="space-y-6 animate-slide-in-up stagger-4">
              {loading ? (
                <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
                  <CardContent className="p-12 text-center">
                    <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50 animate-spin" />
                    <p className="text-muted-foreground">
                      Loading questions...
                    </p>
                  </CardContent>
                </Card>
              ) : filteredQuestions.length === 0 ? (
                <Card className="bg-card/80 backdrop-blur-sm border border-border/50 animate-fade-in-scale">
                  <CardContent className="p-12 text-center">
                    <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No questions found
                    </h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search criteria or add some new
                      questions.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredQuestions.map((question, index) => (
                  <Card
                    key={question.id}
                    className="bg-card/80 backdrop-blur-sm border border-border/50 card-hover"
                  >
                    <CardContent className="p-8">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-2">
                            #{question.id}
                          </p>
                          <p className="font-medium mb-3">{question.text}</p>

                          {question.options && (
                            <div className="space-y-1 mb-3">
                              {question.options.map((option, index) => (
                                <p
                                  key={index}
                                  className="text-sm text-muted-foreground pl-4"
                                >
                                  {String.fromCharCode(65 + index)}. {option}
                                </p>
                              ))}
                              {question.correctAnswer && (
                                <p className="text-sm font-medium text-green-600 pl-4">
                                  ✓ {question.correctAnswer}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{question.type}</Badge>
                            <Badge variant="outline">{question.topic}</Badge>
                            <Badge variant="outline">
                              {question.bloomLevel}
                            </Badge>
                            <Badge
                              variant={
                                question.difficulty === 'Easy'
                                  ? 'default'
                                  : question.difficulty === 'Average'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {question.difficulty}
                            </Badge>
                            <Badge
                              variant={
                                question.approved ? 'default' : 'secondary'
                              }
                            >
                              {question.approved ? '✓ Approved' : '⏳ Pending'}
                            </Badge>
                            <Badge
                              variant={
                                question.createdBy === 'ai'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {question.createdBy === 'ai'
                                ? '🤖 AI Generated'
                                : '👤 Teacher Created'}
                            </Badge>
                            {question.confidenceScore && (
                              <Badge variant="outline">
                                {(question.confidenceScore * 100).toFixed(0)}%
                                confidence
                              </Badge>
                            )}
                            {question.needsReview && (
                              <Badge variant="destructive">Needs Review</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleToggleApproval(
                                question.id,
                                question.approved
                              )
                            }
                            className={`hover:border-primary interactive focus-ring ${
                              question.approved
                                ? 'hover:bg-yellow-50'
                                : 'hover:bg-green-50'
                            }`}
                          >
                            {question.approved ? (
                              <XCircle className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-primary/10 hover:border-primary interactive focus-ring"
                          >
                            <Edit
                              className="h-4 w-4"
                              onClick={() => handleEditQuestion(question)}
                            />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive interactive focus-ring"
                          >
                            <Trash2
                              className="h-4 w-4"
                              onClick={() => handleDeleteQuestion(question.id)}
                            />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
