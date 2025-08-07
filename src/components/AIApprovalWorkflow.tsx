import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  XCircle, 
  Brain, 
  Clock, 
  AlertTriangle, 
  MessageSquare,
  Sparkles,
  TrendingUp,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AIQuestion {
  id: string;
  question_text: string;
  question_type: string;
  topic: string;
  bloom_level: string;
  difficulty: string;
  choices?: any;
  correct_answer?: string;
  ai_confidence_score?: number;
  needs_review: boolean;
  approved: boolean;
  approved_by?: string;
  approval_notes?: string;
  approval_confidence?: number;
  created_at: string;
  created_by: string;
}

interface AIApprovalWorkflowProps {
  onBack: () => void;
}

export const AIApprovalWorkflow = ({ onBack }: AIApprovalWorkflowProps) => {
  const { toast } = useToast();
  const [pendingQuestions, setPendingQuestions] = useState<AIQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterConfidence, setFilterConfidence] = useState<string>("all");
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPendingQuestions();
  }, []);

  const fetchPendingQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('questions')
        .select('*')
        .eq('needs_review', true)
        .or('created_by.eq.AI,created_by.eq.bulk_import')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setPendingQuestions(data || []);
    } catch (error) {
      console.error('Error fetching pending questions:', error);
      toast({
        title: "Error",
        description: "Failed to load pending questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveQuestion = async (questionId: string) => {
    setProcessingId(questionId);
    try {
      const question = pendingQuestions.find(q => q.id === questionId);
      const adminNotes = rejectionReason[questionId] || "";
      
      const { error } = await (supabase as any)
        .from('questions')
        .update({ 
          needs_review: false,
          approved: true,
          approved_by: 'admin',
          approval_notes: adminNotes,
          approval_confidence: question?.ai_confidence_score || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', questionId);

      if (error) {
        throw error;
      }

      toast({
        title: "Question Approved",
        description: "The question has been approved and added to the question bank.",
      });

      await fetchPendingQuestions();
      setRejectionReason(prev => {
        const newReasons = { ...prev };
        delete newReasons[questionId];
        return newReasons;
      });
    } catch (error) {
      console.error('Error approving question:', error);
      toast({
        title: "Error",
        description: "Failed to approve question",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectQuestion = async (questionId: string) => {
    setProcessingId(questionId);
    try {
      const adminNotes = rejectionReason[questionId] || "Question rejected during admin review";
      
      const { error } = await (supabase as any)
        .from('questions')
        .update({
          needs_review: false,
          approved: false,
          approved_by: 'admin',
          approval_notes: adminNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', questionId);

      if (error) {
        throw error;
      }

      toast({
        title: "Question Rejected",
        description: "The question has been marked as rejected with your notes.",
        variant: "destructive",
      });

      await fetchPendingQuestions();
      setRejectionReason(prev => {
        const newReasons = { ...prev };
        delete newReasons[questionId];
        return newReasons;
      });
    } catch (error) {
      console.error('Error rejecting question:', error);
      toast({
        title: "Error",
        description: "Failed to reject question",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredQuestions = pendingQuestions.filter(question => {
    if (filterConfidence === "all") return true;
    const confidence = question.ai_confidence_score || 0;
    
    switch (filterConfidence) {
      case "high":
        return confidence >= 0.8;
      case "medium":
        return confidence >= 0.6 && confidence < 0.8;
      case "low":
        return confidence < 0.6;
      default:
        return true;
    }
  });

  const getConfidenceColor = (score?: number) => {
    if (!score) return "text-muted-foreground";
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceLabel = (score?: number) => {
    if (!score) return "Unknown";
    if (score >= 0.8) return "High";
    if (score >= 0.6) return "Medium";
    return "Low";
  };

  const formatQuestionType = (type: string) => {
    switch (type) {
      case 'mcq':
        return 'Multiple Choice';
      case 'true_false':
        return 'True/False';
      case 'essay':
        return 'Essay';
      case 'fill_in_blank':
        return 'Fill in the Blank';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom section-padding">
        {/* Header */}
        <div className="text-center mb-16 animate-slide-in-down">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
            <Brain className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">AI Question Review</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            AI Approval <span className="text-shimmer">Workflow</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Review and approve AI-generated questions before they're added to the question bank
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
                  <Clock className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold text-primary mb-1">
                {pendingQuestions.length}
              </div>
              <div className="text-sm text-muted-foreground">Pending Review</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
              </div>
              <div className="text-3xl font-bold text-green-500 mb-1">
                {pendingQuestions.filter(q => (q.ai_confidence_score || 0) >= 0.8).length}
              </div>
              <div className="text-sm text-muted-foreground">High Confidence</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border-yellow-500/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-500/20 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
              <div className="text-3xl font-bold text-yellow-500 mb-1">
                {pendingQuestions.filter(q => (q.ai_confidence_score || 0) < 0.6).length}
              </div>
              <div className="text-sm text-muted-foreground">Needs Attention</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-secondary/20 rounded-xl">
                  <Sparkles className="w-6 h-6 text-secondary" />
                </div>
              </div>
              <div className="text-3xl font-bold text-secondary mb-1">
                {((pendingQuestions.reduce((sum, q) => sum + (q.ai_confidence_score || 0), 0) / pendingQuestions.length) * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg. Confidence</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-card mb-8 animate-slide-in-up stagger-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <Select value={filterConfidence} onValueChange={setFilterConfidence}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence Levels</SelectItem>
                  <SelectItem value="high">High (≥80%)</SelectItem>
                  <SelectItem value="medium">Medium (60-79%)</SelectItem>
                  <SelectItem value="low">Low (&lt;60%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Questions List */}
        <div className="space-y-6 animate-slide-in-up stagger-3">
          {loading ? (
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
              <CardContent className="p-12 text-center">
                <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50 animate-spin" />
                <p className="text-muted-foreground">Loading questions for review...</p>
              </CardContent>
            </Card>
          ) : filteredQuestions.length === 0 ? (
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 animate-fade-in-scale">
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {pendingQuestions.length === 0 ? "All caught up!" : "No questions match your filter"}
                </h3>
                <p className="text-muted-foreground">
                  {pendingQuestions.length === 0 
                    ? "There are no AI-generated questions pending review."
                    : "Try adjusting your confidence filter to see more questions."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredQuestions.map((question) => (
              <Card key={question.id} className="bg-card/80 backdrop-blur-sm border border-border/50 card-hover">
                <CardHeader className="border-b border-border/50">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-primary" />
                        <span className="text-sm text-muted-foreground">AI Generated Question</span>
                        {question.ai_confidence_score && (
                          <Badge 
                            variant="outline" 
                            className={`${getConfidenceColor(question.ai_confidence_score)} border-current`}
                          >
                            {getConfidenceLabel(question.ai_confidence_score)} Confidence
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{question.question_text}</CardTitle>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {new Date(question.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Question Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Type</span>
                      <p className="font-medium">{formatQuestionType(question.question_type)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Topic</span>
                      <p className="font-medium">{question.topic}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Bloom Level</span>
                      <p className="font-medium">{question.bloom_level}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Difficulty</span>
                      <p className="font-medium">{question.difficulty}</p>
                    </div>
                  </div>

                  {/* Answer Choices */}
                  {question.choices && (
                    <div>
                      <span className="text-sm text-muted-foreground mb-2 block">Answer Choices</span>
                      <div className="space-y-2">
                        {Object.entries(question.choices).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground min-w-[20px]">
                              {key.toUpperCase()}.
                            </span>
                            <span className={`text-sm ${question.correct_answer === value ? 'font-medium text-green-600' : ''}`}>
                              {value as string}
                              {question.correct_answer === value && <span className="ml-2">✓</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Confidence Score */}
                  {question.ai_confidence_score && (
                    <div>
                      <span className="text-sm text-muted-foreground mb-2 block">AI Confidence Score</span>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                            style={{ width: `${question.ai_confidence_score * 100}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${getConfidenceColor(question.ai_confidence_score)}`}>
                          {(question.ai_confidence_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason Input */}
                  <div>
                    <span className="text-sm text-muted-foreground mb-2 block">Admin Notes (Optional)</span>
                    <Textarea
                      placeholder="Add notes about this question or reason for rejection..."
                      value={rejectionReason[question.id] || ""}
                      onChange={(e) => setRejectionReason(prev => ({
                        ...prev,
                        [question.id]: e.target.value
                      }))}
                      className="min-h-[80px]"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-border/50">
                    <Button
                      onClick={() => handleApproveQuestion(question.id)}
                      disabled={processingId === question.id}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Question
                    </Button>
                    <Button
                      onClick={() => handleRejectQuestion(question.id)}
                      disabled={processingId === question.id}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Question
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};