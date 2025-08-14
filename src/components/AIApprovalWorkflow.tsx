import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Brain, 
  BarChart3, 
  BookOpen,
  MessageSquare 
} from "lucide-react";

interface Question {
  id: string;
  topic: string;
  question_text: string;
  question_type: string;
  bloom_level: string;
  difficulty: string;
  knowledge_dimension: string;
  ai_confidence_score: number;
  needs_review: boolean;
  approved: boolean;
  approval_notes?: string;
  created_at: string;
  choices?: Record<string, string>;
  correct_answer?: string;
}

export function AIApprovalWorkflow() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingQuestions();
  }, []);

  const fetchPendingQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions((data as any) || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch questions for review",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (questionId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          approved,
          approved_by: 'teacher',
          approval_notes: approvalNotes[questionId] || null,
        })
        .eq('id', questionId);

      if (error) throw error;

      setQuestions(prev => prev.filter(q => q.id !== questionId));
      
      toast({
        title: approved ? "Question Approved" : "Question Rejected",
        description: `Question has been ${approved ? 'approved' : 'rejected'} successfully`,
      });
    } catch (error) {
      console.error('Error updating question:', error);
      toast({
        title: "Error",
        description: "Failed to update question approval status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Question Approval</h2>
          <p className="text-muted-foreground">
            Review and approve AI-generated questions ({questions.length} pending)
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {questions.map((question) => (
          <Card key={question.id} className="border-l-4 border-l-yellow-400">
            <CardHeader>
              <CardTitle className="text-lg">{question.topic}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Question:</h4>
                <p className="text-sm bg-muted p-3 rounded">{question.question_text}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApproval(question.id, false)}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApproval(question.id, true)}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {questions.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">
                No questions pending approval at the moment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}