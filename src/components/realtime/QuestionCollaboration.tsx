import React from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { toast } from 'sonner';

interface QuestionCollaborationProps {
  onQuestionUpdate?: (questions: any[]) => void;
  filters?: {
    topic?: string;
    bloom_level?: string;
    difficulty?: string;
  };
}

export function QuestionCollaboration({ onQuestionUpdate, filters }: QuestionCollaborationProps) {
  // Build filter string for realtime subscription
  const buildFilter = () => {
    const conditions = [];
    if (filters?.topic) conditions.push(`topic=eq.${filters.topic}`);
    if (filters?.bloom_level) conditions.push(`bloom_level=eq.${filters.bloom_level}`);
    if (filters?.difficulty) conditions.push(`difficulty=eq.${filters.difficulty}`);
    return conditions.join(',');
  };

  useRealtime('questions-collaboration', {
    table: 'questions',
    filter: buildFilter(),
    onInsert: (payload) => {
      toast.info('New question added');
      // Trigger refresh
      if (onQuestionUpdate) {
        // This would typically refetch questions
        onQuestionUpdate([payload.new]);
      }
    },
    onUpdate: (payload) => {
      if (payload.new.approved !== payload.old.approved) {
        toast.info(`Question ${payload.new.approved ? 'approved' : 'unapproved'}`);
      } else {
        toast.info('Question updated');
      }
      if (onQuestionUpdate) {
        onQuestionUpdate([payload.new]);
      }
    },
    onDelete: (payload) => {
      toast.warning('Question deleted');
    }
  });

  return null; // Headless component
}