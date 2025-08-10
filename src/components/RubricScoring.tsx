import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Save, MessageSquare, Calculator, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RubricCriterion {
  id: string;
  criterion_name: string;
  description: string;
  max_points: number;
  order_index: number;
}

interface QuestionRubric {
  id: string;
  title: string;
  description: string;
  total_points: number;
  criteria: RubricCriterion[];
}

interface StudentResponse {
  id: string;
  student_name: string;
  student_id?: string;
  response_text: string;
  submitted_at: string;
  graded: boolean;
  total_score: number;
}

interface CriterionScore {
  criterion_id: string;
  score: number;
  comments: string;
}

interface RubricScoringProps {
  rubric: QuestionRubric;
  response: StudentResponse;
  onScoreSubmit: (scores: CriterionScore[], totalScore: number) => void;
  onCancel: () => void;
  existingScores?: CriterionScore[];
}

export const RubricScoring: React.FC<RubricScoringProps> = ({
  rubric,
  response,
  onScoreSubmit,
  onCancel,
  existingScores = []
}) => {
  const [scores, setScores] = useState<CriterionScore[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Initialize scores
    const initialScores = rubric.criteria.map(criterion => {
      const existingScore = existingScores.find(s => s.criterion_id === criterion.id);
      return {
        criterion_id: criterion.id!,
        score: existingScore?.score || 0,
        comments: existingScore?.comments || ''
      };
    });
    setScores(initialScores);
  }, [rubric.criteria, existingScores]);

  const updateScore = (criterionId: string, field: 'score' | 'comments', value: number | string) => {
    setScores(prev => prev.map(score => 
      score.criterion_id === criterionId 
        ? { ...score, [field]: value }
        : score
    ));
  };

  const getTotalScore = () => {
    return scores.reduce((sum, score) => sum + score.score, 0);
  };

  const getPercentage = () => {
    const total = getTotalScore();
    return rubric.total_points > 0 ? Math.round((total / rubric.total_points) * 100) : 0;
  };

  const getGradeLetter = (percentage: number) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const totalScore = getTotalScore();
      
      // Save scores to database
      const scoresData = scores.map(score => ({
        response_id: response.id,
        criterion_id: score.criterion_id,
        score: score.score,
        comments: score.comments,
        graded_by: 'teacher'
      }));

      // Delete existing scores for this response
      await (supabase as any)
        .from('rubric_scores')
        .delete()
        .eq('response_id', response.id);

      // Insert new scores
      const { error: scoresError } = await (supabase as any)
        .from('rubric_scores')
        .insert(scoresData);

      if (scoresError) throw scoresError;

      // Update response as graded
      const { error: responseError } = await (supabase as any)
        .from('student_responses')
        .update({
          graded: true,
          total_score: totalScore,
          graded_by: 'teacher',
          graded_at: new Date().toISOString()
        })
        .eq('id', response.id);

      if (responseError) throw responseError;

      toast.success('Rubric scoring saved successfully!');
      onScoreSubmit(scores, totalScore);
    } catch (error) {
      console.error('Error saving rubric scores:', error);
      toast.error('Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Student Response */}
      <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Student Response</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{response.student_name}</Badge>
              {response.student_id && (
                <Badge variant="secondary">{response.student_id}</Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 p-4 rounded-lg border">
            <p className="whitespace-pre-wrap">{response.response_text}</p>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Submitted: {new Date(response.submitted_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Rubric Scoring */}
      <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            {rubric.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{rubric.description}</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Scoring Criteria */}
          {rubric.criteria.map((criterion, index) => {
            const score = scores.find(s => s.criterion_id === criterion.id);
            const currentScore = score?.score || 0;
            const comments = score?.comments || '';

            return (
              <Card key={criterion.id} className="p-4 border border-border/30">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-lg">{criterion.criterion_name}</h4>
                      <p className="text-sm text-muted-foreground">{criterion.description}</p>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      Max: {criterion.max_points} pts
                    </Badge>
                  </div>

                  {/* Score Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label>Score: {currentScore} / {criterion.max_points}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={criterion.max_points}
                          value={currentScore}
                          onChange={(e) => updateScore(criterion.id!, 'score', parseInt(e.target.value) || 0)}
                          className="w-20 text-center"
                        />
                        <span className="text-sm text-muted-foreground">pts</span>
                      </div>
                    </div>
                    
                    <Slider
                      value={[currentScore]}
                      onValueChange={(value) => updateScore(criterion.id!, 'score', value[0])}
                      max={criterion.max_points}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0 (Poor)</span>
                      <span>{Math.floor(criterion.max_points / 2)} (Average)</span>
                      <span>{criterion.max_points} (Excellent)</span>
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <Label htmlFor={`comments-${index}`}>Comments (Optional)</Label>
                    <Textarea
                      id={`comments-${index}`}
                      value={comments}
                      onChange={(e) => updateScore(criterion.id!, 'comments', e.target.value)}
                      placeholder="Provide specific feedback for this criterion..."
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              </Card>
            );
          })}

          <Separator />

          {/* Score Summary */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">
                    {getTotalScore()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                  <div className="text-xs text-muted-foreground">
                    out of {rubric.total_points}
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-secondary mb-1">
                    {getPercentage()}%
                  </div>
                  <div className="text-sm text-muted-foreground">Percentage</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent mb-1">
                    {getGradeLetter(getPercentage())}
                  </div>
                  <div className="text-sm text-muted-foreground">Letter Grade</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border/50">
            <Button 
              onClick={handleSubmit}
              disabled={saving}
              className="bg-gradient-primary hover:shadow-glow btn-hover focus-ring flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {saving ? 'Saving Scores...' : 'Submit Scores'}
            </Button>
            <Button variant="outline" onClick={onCancel} className="focus-ring">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};