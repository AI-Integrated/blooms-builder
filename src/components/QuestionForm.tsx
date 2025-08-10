import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Save, Target, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RubricDefinition } from './RubricDefinition';

interface QuestionFormProps {
  onSave: (question: any) => void;
  onCancel: () => void;
  existingQuestion?: any;
}

interface QuestionRubric {
  id?: string;
  question_id: string;
  title: string;
  description: string;
  total_points: number;
  criteria: Array<{
    id?: string;
    criterion_name: string;
    description: string;
    max_points: number;
    order_index: number;
  }>;
}

export const QuestionForm: React.FC<QuestionFormProps> = ({
  onSave,
  onCancel,
  existingQuestion
}) => {
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    topic: '',
    bloom_level: 'remembering',
    difficulty: 'easy',
    knowledge_dimension: 'factual',
    choices: ['', '', '', ''],
    correct_answer: '',
    created_by: 'teacher'
  });

  const [showRubricDefinition, setShowRubricDefinition] = useState(false);
  const [questionRubric, setQuestionRubric] = useState<QuestionRubric | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingQuestion) {
      setFormData({
        ...existingQuestion,
        choices: existingQuestion.choices ? Object.values(existingQuestion.choices) : ['', '', '', '']
      });
      loadExistingRubric(existingQuestion.id);
    }
  }, [existingQuestion]);

  const loadExistingRubric = async (questionId: string) => {
    try {
      const { data: rubricData, error } = await (supabase as any)
        .from('question_rubrics')
        .select(`
          *,
          criteria:rubric_criteria(*)
        `)
        .eq('question_id', questionId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (rubricData) {
        setQuestionRubric({
          id: rubricData.id,
          question_id: rubricData.question_id,
          title: rubricData.title,
          description: rubricData.description,
          total_points: rubricData.total_points,
          criteria: rubricData.criteria.sort((a, b) => a.order_index - b.order_index)
        });
      }
    } catch (error) {
      console.error('Error loading rubric:', error);
    }
  };

  const updateChoice = (index: number, value: string) => {
    const newChoices = [...formData.choices];
    newChoices[index] = value;
    setFormData(prev => ({ ...prev, choices: newChoices }));
  };

  const addChoice = () => {
    if (formData.choices.length < 6) {
      setFormData(prev => ({ ...prev, choices: [...prev.choices, ''] }));
    }
  };

  const removeChoice = (index: number) => {
    if (formData.choices.length > 2) {
      const newChoices = formData.choices.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, choices: newChoices }));
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.question_text.trim()) {
      toast.error('Please enter a question');
      return;
    }

    if (!formData.topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    // Validate multiple choice questions
    if (formData.question_type === 'multiple_choice') {
      const validChoices = formData.choices.filter(choice => choice.trim());
      if (validChoices.length < 2) {
        toast.error('Multiple choice questions need at least 2 choices');
        return;
      }
      if (!formData.correct_answer.trim()) {
        toast.error('Please specify the correct answer');
        return;
      }
    }

    // Validate essay/short answer questions
    if ((formData.question_type === 'essay' || formData.question_type === 'short_answer') && !questionRubric) {
      toast.error('Please define a rubric for essay/short answer questions');
      return;
    }

    setSaving(true);
    try {
      // Prepare question data
      const questionData = {
        question_text: formData.question_text,
        question_type: formData.question_type,
        topic: formData.topic,
        bloom_level: formData.bloom_level,
        difficulty: formData.difficulty,
        knowledge_dimension: formData.knowledge_dimension,
        choices: formData.question_type === 'multiple_choice' 
          ? formData.choices.reduce((acc, choice, index) => {
              if (choice.trim()) {
                acc[String.fromCharCode(65 + index)] = choice.trim();
              }
              return acc;
            }, {} as Record<string, string>)
          : null,
        correct_answer: formData.question_type === 'multiple_choice' ? formData.correct_answer : null,
        created_by: formData.created_by,
        approved: true // Auto-approve teacher-created questions
      };

      let questionId = existingQuestion?.id;

      if (existingQuestion) {
        // Update existing question
        const { error } = await (supabase as any)
          .from('questions')
          .update(questionData)
          .eq('id', existingQuestion.id);

        if (error) throw error;
      } else {
        // Create new question
        const { data: newQuestion, error } = await (supabase as any)
          .from('questions')
          .insert([questionData])
          .select()
          .single();

        if (error) throw error;
        questionId = newQuestion.id;
      }

      toast.success(existingQuestion ? 'Question updated successfully!' : 'Question created successfully!');
      onSave({ ...questionData, id: questionId });
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleRubricSave = (rubric: QuestionRubric) => {
    setQuestionRubric(rubric);
    setShowRubricDefinition(false);
    toast.success('Rubric defined successfully!');
  };

  const isEssayType = formData.question_type === 'essay' || formData.question_type === 'short_answer';

  if (showRubricDefinition) {
    return (
      <RubricDefinition
        questionId={existingQuestion?.id || 'temp'}
        questionText={formData.question_text}
        onSave={handleRubricSave}
        onCancel={() => setShowRubricDefinition(false)}
        existingRubric={questionRubric}
      />
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-elegant">
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          {existingQuestion ? 'Edit Question' : 'Create New Question'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 p-6">
        {/* Basic Question Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="questionType">Question Type</Label>
            <Select 
              value={formData.question_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, question_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
                <SelectItem value="essay">Essay</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={formData.topic}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="Enter topic"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="bloomLevel">Bloom's Level</Label>
            <Select 
              value={formData.bloom_level} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, bloom_level: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remembering">Remembering</SelectItem>
                <SelectItem value="understanding">Understanding</SelectItem>
                <SelectItem value="applying">Applying</SelectItem>
                <SelectItem value="analyzing">Analyzing</SelectItem>
                <SelectItem value="evaluating">Evaluating</SelectItem>
                <SelectItem value="creating">Creating</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select 
              value={formData.difficulty} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="difficult">Difficult</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="knowledgeDimension">Knowledge Dimension</Label>
            <Select 
              value={formData.knowledge_dimension} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, knowledge_dimension: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="factual">Factual</SelectItem>
                <SelectItem value="conceptual">Conceptual</SelectItem>
                <SelectItem value="procedural">Procedural</SelectItem>
                <SelectItem value="metacognitive">Metacognitive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Question Text */}
        <div>
          <Label htmlFor="questionText">Question Text</Label>
          <Textarea
            id="questionText"
            value={formData.question_text}
            onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
            placeholder="Enter your question here..."
            className="min-h-[120px]"
          />
        </div>

        {/* Multiple Choice Options */}
        {formData.question_type === 'multiple_choice' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label>Answer Choices</Label>
              <Button onClick={addChoice} variant="outline" size="sm" disabled={formData.choices.length >= 6}>
                <Plus className="w-4 h-4 mr-2" />
                Add Choice
              </Button>
            </div>
            
            <div className="space-y-3">
              {formData.choices.map((choice, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <span className="text-sm font-medium min-w-[20px]">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <Input
                    value={choice}
                    onChange={(e) => updateChoice(index, e.target.value)}
                    placeholder={`Choice ${String.fromCharCode(65 + index)}`}
                    className="flex-1"
                  />
                  {formData.choices.length > 2 && (
                    <Button
                      onClick={() => removeChoice(index)}
                      variant="outline"
                      size="sm"
                      className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Label htmlFor="correctAnswer">Correct Answer</Label>
              <Input
                id="correctAnswer"
                value={formData.correct_answer}
                onChange={(e) => setFormData(prev => ({ ...prev, correct_answer: e.target.value }))}
                placeholder="Enter the correct answer exactly as written above"
              />
            </div>
          </div>
        )}

        {/* True/False Options */}
        {formData.question_type === 'true_false' && (
          <div>
            <Label>Correct Answer</Label>
            <Select 
              value={formData.correct_answer} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, correct_answer: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select correct answer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="True">True</SelectItem>
                <SelectItem value="False">False</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Essay/Short Answer Rubric Section */}
        {isEssayType && (
          <div>
            <Separator />
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Evaluation Rubric</h3>
                  <p className="text-sm text-muted-foreground">
                    Define how this question will be graded
                  </p>
                </div>
                <Button 
                  onClick={() => setShowRubricDefinition(true)}
                  variant={questionRubric ? "outline" : "default"}
                  size="sm"
                >
                  <Target className="w-4 h-4 mr-2" />
                  {questionRubric ? 'Edit Rubric' : 'Define Rubric'}
                </Button>
              </div>

              {questionRubric && (
                <Card className="bg-muted/30 border-muted">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{questionRubric.title}</h4>
                        <p className="text-sm text-muted-foreground">{questionRubric.description}</p>
                      </div>
                      <Badge variant="secondary">
                        {questionRubric.total_points} points
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Criteria:</span>
                      <div className="flex flex-wrap gap-2">
                        {questionRubric.criteria.map((criterion, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {criterion.criterion_name} ({criterion.max_points}pts)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isEssayType && !questionRubric && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <Target className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Rubric Required: Please define evaluation criteria for this {formData.question_type} question
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border/50">
          <Button 
            onClick={handleSave}
            disabled={saving || (isEssayType && !questionRubric)}
            className="bg-gradient-primary hover:shadow-glow btn-hover focus-ring"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : (existingQuestion ? 'Update Question' : 'Create Question')}
          </Button>
          <Button variant="outline" onClick={onCancel} className="focus-ring">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};