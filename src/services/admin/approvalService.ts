import { supabase } from "@/integrations/supabase/client";

export interface ApprovalStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  avgConfidence: number;
}

export interface PendingQuestion {
  id: string;
  question_text: string;
  topic: string;
  bloom_level: string;
  difficulty: string;
  question_type: string;
  choices?: any;
  correct_answer: string;
  ai_confidence_score: number;
  created_at: string;
  metadata?: any;
  created_by: string;
}

/**
 * Admin Approval Service
 * Handles approval workflow for AI-generated questions
 */
export class ApprovalService {
  
  /**
   * Get all pending AI-generated questions
   */
  async getPendingQuestions(): Promise<PendingQuestion[]> {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('created_by', 'ai')
      .eq('status', 'pending')
      .eq('approved', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending questions:', error);
      return [];
    }

    return data as PendingQuestion[];
  }

  /**
   * Approve a question
   */
  async approveQuestion(questionId: string, adminId: string): Promise<boolean> {
    const { error } = await supabase
      .from('questions')
      .update({
        approved: true,
        status: 'approved',
        approved_by: adminId,
        approval_timestamp: new Date().toISOString()
      })
      .eq('id', questionId);

    if (error) {
      console.error('Error approving question:', error);
      return false;
    }

    // Log approval
    await this.logApproval(questionId, adminId, 'approved');
    return true;
  }

  /**
   * Reject a question
   */
  async rejectQuestion(questionId: string, adminId: string, reason?: string): Promise<boolean> {
    const { error } = await supabase
      .from('questions')
      .update({
        status: 'rejected',
        deleted: true,
        approval_notes: reason
      })
      .eq('id', questionId);

    if (error) {
      console.error('Error rejecting question:', error);
      return false;
    }

    // Log rejection
    await this.logApproval(questionId, adminId, 'rejected', reason);
    return true;
  }

  /**
   * Batch approve multiple questions
   */
  async batchApprove(questionIds: string[], adminId: string): Promise<number> {
    let successCount = 0;

    for (const questionId of questionIds) {
      const success = await this.approveQuestion(questionId, adminId);
      if (success) successCount++;
    }

    return successCount;
  }

  /**
   * Get approval statistics
   */
  async getApprovalStats(): Promise<ApprovalStats> {
    const { data: pending } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', 'ai')
      .eq('status', 'pending');

    const { data: approved } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', 'ai')
      .eq('status', 'approved');

    const { data: rejected } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', 'ai')
      .eq('status', 'rejected');

    const { data: confidenceData } = await supabase
      .from('questions')
      .select('ai_confidence_score')
      .eq('created_by', 'ai')
      .not('ai_confidence_score', 'is', null);

    const avgConfidence = confidenceData && confidenceData.length > 0
      ? confidenceData.reduce((sum, q) => sum + (q.ai_confidence_score || 0), 0) / confidenceData.length
      : 0;

    return {
      totalPending: pending?.length || 0,
      totalApproved: approved?.length || 0,
      totalRejected: rejected?.length || 0,
      avgConfidence
    };
  }

  /**
   * Log approval action for audit trail
   */
  private async logApproval(
    questionId: string,
    adminId: string,
    action: 'approved' | 'rejected',
    notes?: string
  ): Promise<void> {
    await supabase
      .from('ai_generation_logs')
      .update({
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        rejection_reason: action === 'rejected' ? notes : null
      })
      .eq('question_id', questionId);
  }

  /**
   * Subscribe to pending questions changes
   */
  subscribeToPendingQuestions(callback: (payload: any) => void) {
    return supabase
      .channel('pending-questions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: 'created_by=eq.ai'
        },
        callback
      )
      .subscribe();
  }
}

export const approvalService = new ApprovalService();
