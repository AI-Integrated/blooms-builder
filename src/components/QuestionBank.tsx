import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, BookOpen, Brain, CheckCircle, Clock, Filter, Sparkles, Upload, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BulkImport from './BulkImport';
import { QuestionForm } from './QuestionForm';

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
}

interface QuestionBankProps {
  onBack: () => void;
}

export const QuestionBank = ({ onBack }: QuestionBankProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedBloomLevel, setSelectedBloomLevel] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      // Only fetch approved questions for test generation
      const { data, error } = await (supabase as any)
        .from('questions')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform database data to match component interface
      const transformedQuestions: Question[] = (data || []).map(q => ({
        id: q.id,
        text: q.question_text,
        type: q.question_type === 'mcq' ? 'Multiple Choice' : 
              q.question_type === 'true_false' ? 'True/False' : 'Essay',
        topic: q.topic,
        bloomLevel: q.bloom_level.charAt(0).toUpperCase() + q.bloom_level.slice(1),
        difficulty: q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1),
        options: q.choices ? Object.values(q.choices) : undefined,
        correctAnswer: q.correct_answer || undefined,
        createdBy: q.created_by === 'bulk_import' ? 'ai' : 'teacher'
      }));

      setQuestions(transformedQuestions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const topics = ["Requirements Engineering", "Data and Process Modeling", "Object Modeling & Development"];
  const bloomLevels = ["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"];

  const filteredQuestions = questions.filter(question => {
    return (
      (searchTerm === "" || question.text.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedTopic === "" || selectedTopic === "all" || question.topic === selectedTopic) &&
      (selectedBloomLevel === "" || selectedBloomLevel === "all" || question.bloomLevel === selectedBloomLevel) &&
      (selectedDifficulty === "" || selectedDifficulty === "all" || question.difficulty === selectedDifficulty)
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
      const { error } = await (supabase as any)
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question deleted successfully!"
      });
      
      await fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom section-padding">
        {/* Animated Header */}
        <div className="text-center mb-16 animate-slide-in-down">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
            <Brain className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Intelligent Question Management</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            Question <span className="text-shimmer">Bank</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Organize, categorize, and manage your questions with AI-powered insights
          </p>
          <Button variant="outline" onClick={onBack} className="interactive focus-ring">
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
                {questions.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Questions</div>
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
                {questions.filter(q => q.createdBy === 'ai').length}
              </div>
              <div className="text-sm text-muted-foreground">AI Generated</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent/20 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-accent" />
                </div>
              </div>
              <div className="text-3xl font-bold text-accent mb-1">
                {questions.filter(q => q.createdBy === 'teacher').length}
              </div>
              <div className="text-sm text-muted-foreground">Teacher Created</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500/20 rounded-xl">
                  <Filter className="w-6 h-6 text-orange-500" />
                </div>
              </div>
              <div className="text-3xl font-bold text-orange-500 mb-1">
                {topics.length}
              </div>
              <div className="text-sm text-muted-foreground">Topics</div>
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
              <h2 className="text-2xl font-bold text-foreground">Questions Library</h2>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowBulkImport(true)}
                  variant="outline"
                  className="interactive focus-ring"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Import
                </Button>
                <Button 
                  onClick={() => setShowAddForm(true)}
                  variant="outline"
                  className="interactive focus-ring"
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Grade Essays
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger>
                <SelectValue placeholder="All Topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedBloomLevel} onValueChange={setSelectedBloomLevel}>
              <SelectTrigger>
                <SelectValue placeholder="All Bloom Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bloom Levels</SelectItem>
                {bloomLevels.map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
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

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setSelectedTopic("all");
                setSelectedBloomLevel("all");
                setSelectedDifficulty("all");
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
                    <p className="text-muted-foreground">Loading questions...</p>
                  </CardContent>
                </Card>
              ) : filteredQuestions.length === 0 ? (
                <Card className="bg-card/80 backdrop-blur-sm border border-border/50 animate-fade-in-scale">
                  <CardContent className="p-12 text-center">
                    <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No questions found</h3>
                    <p className="text-muted-foreground">Try adjusting your search criteria or add some new questions.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredQuestions.map((question, index) => (
                  <Card key={question.id} className="bg-card/80 backdrop-blur-sm border border-border/50 card-hover">
                    <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">#{question.id}</p>
                        <p className="font-medium mb-3">{question.text}</p>
                        
                        {question.options && (
                          <div className="space-y-1 mb-3">
                            {question.options.map((option, index) => (
                              <p key={index} className="text-sm text-muted-foreground pl-4">
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
                          <Badge variant="outline">{question.bloomLevel}</Badge>
                          <Badge variant={question.difficulty === 'Easy' ? 'default' : question.difficulty === 'Average' ? 'secondary' : 'destructive'}>
                            {question.difficulty}
                          </Badge>
                          <Badge variant={question.createdBy === 'ai' ? 'default' : 'secondary'}>
                            {question.createdBy === 'ai' ? '🤖 AI Generated' : '👤 Teacher Created'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" className="hover:bg-primary/10 hover:border-primary interactive focus-ring">
                          <Edit 
                            className="h-4 w-4" 
                            onClick={() => handleEditQuestion(question)}
                          />
                        </Button>
                        <Button variant="outline" size="sm" className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive interactive focus-ring">
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