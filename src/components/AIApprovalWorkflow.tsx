import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock, Brain, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  topic: string;
  question_text: string;
  question_type: string;
  choices?: any;
  correct_answer?: string;
  bloom_level: string;
  difficulty: string;
  confidence?: number;
  created_by: string;
  approved: boolean;
  created_at: string;
}

interface AIApprovalWorkflowProps {
  onBack: () => void;
}

export default function AIApprovalWorkflow({ onBack }: AIApprovalWorkflowProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingQuestions();
  }, []);

  const fetchPendingQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('created_by', 'ai')
        .eq('approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch questions for approval.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (questionId: string, approve: boolean) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ approved: approve })
        .eq('id', questionId);

      if (error) throw error;

      setQuestions(prev => prev.filter(q => q.id !== questionId));
      
      toast({
        title: approve ? "Question Approved" : "Question Rejected",
        description: `The AI-generated question has been ${approve ? 'approved' : 'rejected'}.`,
      });
    } catch (error) {
      console.error('Error updating question:', error);
      toast({
        title: "Error",
        description: "Failed to update question approval status.",
        variant: "destructive",
      });
    }
  };

  const renderChoices = (choices: any) => {
    if (!choices || !Array.isArray(choices)) return null;
    
    return (
      <div className="mt-2 space-y-1">
        {choices.map((choice: string, index: number) => (
          <div key={index} className="text-sm text-muted-foreground">
            {String.fromCharCode(65 + index)}. {choice}
          </div>
        ))}
      </div>
    );
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-500';
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading questions for approval...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            AI Question Approval
          </h1>
          <p className="text-muted-foreground">Review and approve AI-generated questions</p>
        </div>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No AI-generated questions pending approval.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              Pending Questions ({questions.length})
            </h2>
          </div>

          {questions.map((question) => (
            <Card key={question.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{question.question_text}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{question.question_type}</Badge>
                    <Badge variant="outline">{question.bloom_level}</Badge>
                    <Badge variant="outline">{question.difficulty}</Badge>
                    {question.confidence && (
                      <Badge 
                        className={`text-white ${getConfidenceColor(question.confidence)}`}
                      >
                        {Math.round(question.confidence * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Topic: {question.topic} • Created: {new Date(question.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {question.question_type === 'mcq' && renderChoices(question.choices)}
                {question.correct_answer && (
                  <div className="mt-2">
                    <strong>Correct Answer:</strong> {question.correct_answer}
                  </div>
                )}
                
                <Separator className="my-4" />
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleApproval(question.id, false)}
                    className="gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApproval(question.id, true)}
                    className="gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}