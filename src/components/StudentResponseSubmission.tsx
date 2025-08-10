import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, Clock, FileText, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  topic: string;
  bloom_level: string;
  difficulty: string;
}

interface StudentResponseSubmissionProps {
  question: Question;
  onSubmit: (response: any) => void;
  onCancel: () => void;
}

export const StudentResponseSubmission: React.FC<StudentResponseSubmissionProps> = ({
  question,
  onSubmit,
  onCancel
}) => {
  const [studentData, setStudentData] = useState({
    student_name: '',
    student_id: '',
    response_text: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentData.student_name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!studentData.response_text.trim()) {
      toast.error('Please enter your response');
      return;
    }

    setSubmitting(true);
    try {
      const responseData = {
        question_id: question.id,
        student_name: studentData.student_name,
        student_id: studentData.student_id || null,
        response_text: studentData.response_text,
        submitted_at: new Date().toISOString(),
        graded: false,
        total_score: 0
      };

      const { data, error } = await (supabase as any)
        .from('student_responses')
        .insert([responseData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Response submitted successfully!');
      onSubmit(data);
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-elegant">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Submit Your Response
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          {/* Question Display */}
          <div>
            <div className="flex gap-2 mb-4">
              <Badge variant="outline">{question.topic}</Badge>
              <Badge variant="outline">{question.bloom_level}</Badge>
              <Badge variant="outline">{question.difficulty}</Badge>
              <Badge variant="secondary">{question.question_type}</Badge>
            </div>
            
            <Card className="bg-muted/30 border-muted">
              <CardContent className="p-4">
                <p className="font-medium text-lg">{question.question_text}</p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Student Information */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="studentName">Student Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="studentName"
                    value={studentData.student_name}
                    onChange={(e) => setStudentData(prev => ({ ...prev, student_name: e.target.value }))}
                    placeholder="Enter your full name"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="studentId">Student ID (Optional)</Label>
                <Input
                  id="studentId"
                  value={studentData.student_id}
                  onChange={(e) => setStudentData(prev => ({ ...prev, student_id: e.target.value }))}
                  placeholder="Enter your student ID"
                />
              </div>
            </div>

            {/* Response Area */}
            <div>
              <Label htmlFor="responseText">Your Response *</Label>
              <Textarea
                id="responseText"
                value={studentData.response_text}
                onChange={(e) => setStudentData(prev => ({ ...prev, response_text: e.target.value }))}
                placeholder={question.question_type === 'essay' 
                  ? "Write your essay response here. Be thorough and well-organized..."
                  : "Write your short answer here. Be clear and concise..."
                }
                className="min-h-[200px]"
                required
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-muted-foreground">
                  {studentData.response_text.length} characters
                </span>
                <span className="text-sm text-muted-foreground">
                  {question.question_type === 'essay' ? 'Recommended: 300+ words' : 'Recommended: 50-150 words'}
                </span>
              </div>
            </div>

            {/* Submission Guidelines */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-blue-800">Submission Guidelines</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Review your response carefully before submitting</li>
                      <li>• Once submitted, you cannot edit your response</li>
                      <li>• Your response will be graded using a detailed rubric</li>
                      <li>• You'll receive feedback on specific evaluation criteria</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-border/50">
              <Button 
                type="submit"
                disabled={submitting}
                className="bg-gradient-primary hover:shadow-glow btn-hover focus-ring flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Response'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="focus-ring">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};