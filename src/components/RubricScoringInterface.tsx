import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Rubrics, type Rubric, type RubricScore } from '@/services/db/rubrics';

interface RubricScoringInterfaceProps {
  rubricId: string;
  questionId: string;
  testId?: string;
  studentId?: string;
  studentName?: string;
  onBack: () => void;
  onScoreSaved?: (score: RubricScore) => void;
  initialScore?: RubricScore;
}

export function RubricScoringInterface({
  rubricId,
  questionId,
  testId,
  studentId,
  studentName,
  onBack,
  onScoreSaved,
  initialScore
}: RubricScoringInterfaceProps) {
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadRubric();
  }, [rubricId]);

  useEffect(() => {
    if (initialScore) {
      setScores(initialScore.scores);
      setComments(initialScore.comments || '');
    }
  }, [initialScore]);

  const loadRubric = async () => {
    try {
      const rubricData = await Rubrics.getById(rubricId);
      setRubric(rubricData);
      
      // Initialize scores if not already set
      if (!initialScore && rubricData.criteria) {
        const initialScores: Record<string, number> = {};
        rubricData.criteria.forEach((criterion) => {
          if (criterion.id) {
            initialScores[criterion.id] = Math.floor(criterion.max_score / 2);
          }
        });
        setScores(initialScores);
      }
    } catch (error) {
      console.error('Error loading rubric:', error);
      toast.error('Failed to load rubric');
    } finally {
      setIsLoading(false);
    }
  };

  const updateScore = (criterionId: string, score: number[]) => {
    setScores(prev => ({
      ...prev,
      [criterionId]: score[0]
    }));
  };

  const calculateTotalScore = () => {
    if (!rubric?.criteria) return 0;
    
    return rubric.criteria.reduce((total, criterion) => {
      if (!criterion.id) return total;
      const score = scores[criterion.id] || 0;
      return total + (score * criterion.weight);
    }, 0);
  };

  const calculateMaxPossibleScore = () => {
    if (!rubric?.criteria) return 0;
    
    return rubric.criteria.reduce((total, criterion) => {
      return total + (criterion.max_score * criterion.weight);
    }, 0);
  };

  const getScorePercentage = () => {
    const total = calculateTotalScore();
    const max = calculateMaxPossibleScore();
    return max > 0 ? (total / max) * 100 : 0;
  };

  const handleSave = async () => {
    if (!rubric) return;

    setIsSaving(true);
    try {
      const scoreData = {
        question_id: questionId,
        test_id: testId,
        student_id: studentId,
        student_name: studentName,
        scores,
        comments: comments.trim()
      };

      let result;
      if (initialScore?.id) {
        result = await Rubrics.updateScore(initialScore.id, {
          scores,
          comments: comments.trim()
        });
        toast.success('Score updated successfully!');
      } else {
        result = await Rubrics.submitScore(scoreData);
        toast.success('Score saved successfully!');
      }

      onScoreSaved?.(result);
    } catch (error) {
      console.error('Error saving score:', error);
      toast.error('Failed to save score. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p>Loading rubric...</p>
        </div>
      </div>
    );
  }

  if (!rubric) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p>Rubric not found</p>
          <Button onClick={onBack} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{rubric.title}</h1>
          {rubric.description && (
            <p className="text-muted-foreground">{rubric.description}</p>
          )}
        </div>
      </div>

      {studentName && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Student:</strong> {studentName}</p>
            {studentId && <p><strong>ID:</strong> {studentId}</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Scoring Criteria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {rubric.criteria?.map((criterion, index) => (
                <div key={criterion.id || index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{criterion.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">Weight: {criterion.weight}</Badge>
                        <Badge variant="outline">Max: {criterion.max_score}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {criterion.id ? (scores[criterion.id] || 0) : 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Weighted: {criterion.id ? 
                          ((scores[criterion.id] || 0) * criterion.weight).toFixed(1) : 
                          '0.0'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {criterion.id && (
                    <div className="px-2">
                      <Slider
                        value={[scores[criterion.id] || 0]}
                        onValueChange={(value) => updateScore(criterion.id!, value)}
                        max={criterion.max_score}
                        min={0}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0</span>
                        <span>{criterion.max_score}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="comments">Additional Feedback</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Optional comments about the student's work..."
                rows={4}
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Score Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Score</p>
                <p className="text-3xl font-bold text-primary">
                  {calculateTotalScore().toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">
                  out of {calculateMaxPossibleScore().toFixed(1)}
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Percentage</p>
                <p className="text-2xl font-bold">
                  {getScorePercentage().toFixed(1)}%
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Breakdown:</p>
                {rubric.criteria?.map((criterion, index) => (
                  <div key={criterion.id || index} className="flex justify-between text-sm">
                    <span className="truncate">{criterion.name}</span>
                    <span className="text-muted-foreground">
                      {criterion.id ? 
                        ((scores[criterion.id] || 0) * criterion.weight).toFixed(1) : 
                        '0.0'
                      }pts
                    </span>
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleSave} 
                className="w-full"
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Score'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}