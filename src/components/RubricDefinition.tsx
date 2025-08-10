import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Save, Target, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RubricCriterion {
  id?: string;
  criterion_name: string;
  description: string;
  max_points: number;
  order_index: number;
}

interface QuestionRubric {
  id?: string;
  question_id: string;
  title: string;
  description: string;
  total_points: number;
  criteria: RubricCriterion[];
}

interface RubricDefinitionProps {
  questionId: string;
  questionText: string;
  onSave: (rubric: QuestionRubric) => void;
  onCancel: () => void;
  existingRubric?: QuestionRubric;
}

export const RubricDefinition: React.FC<RubricDefinitionProps> = ({
  questionId,
  questionText,
  onSave,
  onCancel,
  existingRubric
}) => {
  const [rubric, setRubric] = useState<QuestionRubric>({
    question_id: questionId,
    title: 'Essay Evaluation Rubric',
    description: 'Comprehensive rubric for evaluating this response',
    total_points: 10,
    criteria: [
      {
        criterion_name: 'Content Knowledge',
        description: 'Demonstrates understanding of key concepts',
        max_points: 4,
        order_index: 1
      },
      {
        criterion_name: 'Organization',
        description: 'Clear structure and logical flow',
        max_points: 3,
        order_index: 2
      },
      {
        criterion_name: 'Writing Quality',
        description: 'Grammar, spelling, and clarity',
        max_points: 3,
        order_index: 3
      }
    ]
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingRubric) {
      setRubric(existingRubric);
    }
  }, [existingRubric]);

  useEffect(() => {
    // Recalculate total points when criteria change
    const totalPoints = rubric.criteria.reduce((sum, criterion) => sum + criterion.max_points, 0);
    setRubric(prev => ({ ...prev, total_points: totalPoints }));
  }, [rubric.criteria]);

  const addCriterion = () => {
    const newCriterion: RubricCriterion = {
      criterion_name: '',
      description: '',
      max_points: 1,
      order_index: rubric.criteria.length + 1
    };
    setRubric(prev => ({
      ...prev,
      criteria: [...prev.criteria, newCriterion]
    }));
  };

  const removeCriterion = (index: number) => {
    if (rubric.criteria.length > 1) {
      setRubric(prev => ({
        ...prev,
        criteria: prev.criteria.filter((_, i) => i !== index)
      }));
    }
  };

  const updateCriterion = (index: number, field: keyof RubricCriterion, value: string | number) => {
    setRubric(prev => ({
      ...prev,
      criteria: prev.criteria.map((criterion, i) => 
        i === index ? { ...criterion, [field]: value } : criterion
      )
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!rubric.title.trim()) {
      toast.error('Please enter a rubric title');
      return;
    }

    if (rubric.criteria.some(c => !c.criterion_name.trim())) {
      toast.error('Please fill in all criterion names');
      return;
    }

    if (rubric.criteria.some(c => c.max_points <= 0)) {
      toast.error('All criteria must have points greater than 0');
      return;
    }

    setSaving(true);
    try {
      // Save rubric to database
      const rubricData = {
        question_id: questionId,
        title: rubric.title,
        description: rubric.description,
        total_points: rubric.total_points,
        created_by: 'teacher'
      };

      let rubricId = rubric.id;

      if (existingRubric?.id) {
        // Update existing rubric
        const { error: rubricError } = await (supabase as any)
          .from('question_rubrics')
          .update(rubricData)
          .eq('id', existingRubric.id);

        if (rubricError) throw rubricError;
        rubricId = existingRubric.id;

        // Delete existing criteria
        await (supabase as any)
          .from('rubric_criteria')
          .delete()
          .eq('rubric_id', rubricId);
      } else {
        // Create new rubric
        const { data: newRubric, error: rubricError } = await (supabase as any)
          .from('question_rubrics')
          .insert([rubricData])
          .select()
          .single();

        if (rubricError) throw rubricError;
        rubricId = newRubric.id;
      }

      // Save criteria
      const criteriaData = rubric.criteria.map((criterion, index) => ({
        rubric_id: rubricId,
        criterion_name: criterion.criterion_name,
        description: criterion.description,
        max_points: criterion.max_points,
        order_index: index + 1
      }));

      const { error: criteriaError } = await (supabase as any)
        .from('rubric_criteria')
        .insert(criteriaData);

      if (criteriaError) throw criteriaError;

      toast.success('Rubric saved successfully!');
      onSave({ ...rubric, id: rubricId });
    } catch (error) {
      console.error('Error saving rubric:', error);
      toast.error('Failed to save rubric');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-elegant">
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Define Evaluation Rubric
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          <strong>Question:</strong> {questionText}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 p-6">
        {/* Rubric Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rubricTitle">Rubric Title</Label>
            <Input
              id="rubricTitle"
              value={rubric.title}
              onChange={(e) => setRubric(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Essay Evaluation Rubric"
            />
          </div>
          <div>
            <Label>Total Points</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {rubric.total_points} points
              </Badge>
              <span className="text-sm text-muted-foreground">(Auto-calculated)</span>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="rubricDescription">Description</Label>
          <Textarea
            id="rubricDescription"
            value={rubric.description}
            onChange={(e) => setRubric(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of what this rubric evaluates..."
            className="min-h-[80px]"
          />
        </div>

        <Separator />

        {/* Criteria Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Evaluation Criteria</h3>
              <p className="text-sm text-muted-foreground">
                Define the specific aspects you'll evaluate in student responses
              </p>
            </div>
            <Button onClick={addCriterion} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Criterion
            </Button>
          </div>

          <div className="space-y-4">
            {rubric.criteria.map((criterion, index) => (
              <Card key={index} className="p-4 border border-border/30">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-3">
                    <Label>Criterion Name</Label>
                    <Input
                      value={criterion.criterion_name}
                      onChange={(e) => updateCriterion(index, 'criterion_name', e.target.value)}
                      placeholder="e.g., Content Knowledge"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <Label>Description</Label>
                    <Input
                      value={criterion.description}
                      onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                      placeholder="e.g., Demonstrates understanding of key concepts"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Max Points</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={criterion.max_points}
                      onChange={(e) => updateCriterion(index, 'max_points', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Button
                      onClick={() => removeCriterion(index)}
                      variant="outline"
                      size="sm"
                      disabled={rubric.criteria.length === 1}
                      className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Scoring Guidelines */}
        <Card className="bg-muted/30 border-muted">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm mb-2">Scoring Guidelines</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Each criterion will be scored from 0 to its maximum points</li>
                  <li>• Teachers can add comments for each criterion during grading</li>
                  <li>• Total score is automatically calculated from all criteria</li>
                  <li>• Students will see their scores and feedback for each criterion</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border/50">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-gradient-primary hover:shadow-glow btn-hover focus-ring"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Rubric'}
          </Button>
          <Button variant="outline" onClick={onCancel} className="focus-ring">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};