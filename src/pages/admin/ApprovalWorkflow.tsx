import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Brain, Loader2, AlertCircle, CheckCheck } from 'lucide-react';
import { approvalService } from '@/services/admin/approvalService';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

export default function ApprovalWorkflow() {
  const [pendingQuestions, setPendingQuestions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
    
    // Subscribe to realtime updates
    const subscription = approvalService.subscribeToPendingQuestions(() => {
      loadData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [questions, approvalStats] = await Promise.all([
        approvalService.getPendingQuestions(),
        approvalService.getApprovalStats()
      ]);

      setPendingQuestions(questions);
      setStats(approvalStats);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load approval data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (questionId: string) => {
    setProcessing(questionId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const success = await approvalService.approveQuestion(questionId, user.id);
      
      if (success) {
        toast.success('Question approved successfully');
        await loadData();
      } else {
        toast.error('Failed to approve question');
      }
    } catch (error) {
      console.error('Error approving question:', error);
      toast.error('Failed to approve question');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (questionId: string) => {
    setProcessing(questionId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const success = await approvalService.rejectQuestion(questionId, user.id);
      
      if (success) {
        toast.success('Question rejected');
        await loadData();
      } else {
        toast.error('Failed to reject question');
      }
    } catch (error) {
      console.error('Error rejecting question:', error);
      toast.error('Failed to reject question');
    } finally {
      setProcessing(null);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedQuestions.size === 0) {
      toast.error('No questions selected');
      return;
    }

    setProcessing('batch');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const count = await approvalService.batchApprove(Array.from(selectedQuestions), user.id);
      
      toast.success(`Approved ${count} questions`);
      setSelectedQuestions(new Set());
      await loadData();
    } catch (error) {
      console.error('Error batch approving:', error);
      toast.error('Failed to batch approve');
    } finally {
      setProcessing(null);
    }
  };

  const toggleSelection = (questionId: string) => {
    const newSelection = new Set(selectedQuestions);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedQuestions(newSelection);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          AI Question Approval Workflow
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and approve AI-generated questions
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalPending}</div>
                <div className="text-sm text-muted-foreground">Pending Review</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalApproved}</div>
                <div className="text-sm text-muted-foreground">Approved</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalRejected}</div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Brain className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Avg Confidence</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Pending Questions ({pendingQuestions.length})
            </CardTitle>
            {selectedQuestions.size > 0 && (
              <Button
                onClick={handleBatchApprove}
                disabled={processing === 'batch'}
                className="gap-2"
              >
                {processing === 'batch' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
                Approve Selected ({selectedQuestions.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingQuestions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">No AI-generated questions pending approval.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingQuestions.map((question) => (
                <div key={question.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.has(question.id)}
                      onChange={() => toggleSelection(question.id)}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline">{question.topic}</Badge>
                        <Badge variant="outline">{question.bloom_level}</Badge>
                        <Badge variant="outline">{question.difficulty}</Badge>
                        <Badge className="bg-purple-100 text-purple-800">
                          AI Confidence: {(question.ai_confidence_score * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <p className="text-sm font-medium mb-2">{question.question_text}</p>
                      
                      {question.question_type === 'mcq' && question.choices && (
                        <div className="ml-4 space-y-1">
                          {Object.entries(question.choices as Record<string, string>).map(([key, value]) => (
                            <div 
                              key={key} 
                              className={`text-sm ${
                                key === question.correct_answer
                                  ? 'text-green-600 font-medium'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {key}. {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Generated {new Date(question.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(question.id)}
                        disabled={processing === question.id}
                        className="gap-2"
                      >
                        {processing === question.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(question.id)}
                        disabled={processing === question.id}
                        className="gap-2"
                      >
                        {processing === question.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
