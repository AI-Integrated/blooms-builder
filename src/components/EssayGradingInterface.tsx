import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Plus, Trash2, FileText, GraduationCap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface EssayQuestion {
  id: string;
  question_text: string;
  max_points: number;
  rubric_criteria: Array<{
    id: string;
    name: string;
    description: string;
    max_points: number;
  }>;
}

interface StudentResponse {
  id: string;
  student_name: string;
  student_id: string;
  response_text: string;
  submitted_at: string;
}

interface GradingCriteria {
  id: string;
  points: number;
  feedback: string;
}

export default function EssayGradingInterface() {
  const [selectedQuestion, setSelectedQuestion] = useState<EssayQuestion | null>(null);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [currentResponse, setCurrentResponse] = useState<StudentResponse | null>(null);
  const [grades, setGrades] = useState<GradingCriteria[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [overallFeedback, setOverallFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  // Mock data for demo purposes
  const mockQuestions: EssayQuestion[] = [
    {
      id: '1',
      question_text: 'Explain the importance of software engineering principles in modern web development.',
      max_points: 100,
      rubric_criteria: [
        { id: '1', name: 'Content Knowledge', description: 'Understanding of software engineering concepts', max_points: 40 },
        { id: '2', name: 'Analysis & Examples', description: 'Use of relevant examples and analysis', max_points: 30 },
        { id: '3', name: 'Organization & Clarity', description: 'Clear structure and presentation', max_points: 20 },
        { id: '4', name: 'Grammar & Style', description: 'Proper grammar and writing style', max_points: 10 }
      ]
    }
  ];

  const mockResponses: StudentResponse[] = [
    {
      id: '1',
      student_name: 'John Smith',
      student_id: 'ST001',
      response_text: 'Software engineering principles are crucial in modern web development because they provide a structured approach to creating maintainable, scalable, and reliable applications. These principles include modularity, separation of concerns, and proper documentation. For example, using design patterns like MVC helps separate business logic from presentation layers, making code easier to maintain and debug. Additionally, principles like DRY (Don\'t Repeat Yourself) help reduce redundancy and improve code quality. In modern frameworks like React or Angular, these principles are embedded into the architecture, encouraging developers to write cleaner, more organized code.',
      submitted_at: new Date().toISOString()
    },
    {
      id: '2',
      student_name: 'Jane Doe',
      student_id: 'ST002',
      response_text: 'Software engineering is important for web development. It helps make better websites. You need to use good practices like testing and documentation. Modern websites are complex so you need to follow rules to make them work properly.',
      submitted_at: new Date().toISOString()
    }
  ];

  useEffect(() => {
    if (selectedQuestion) {
      setResponses(mockResponses);
      setCurrentResponse(mockResponses[0]);
      // Initialize grades for the selected question
      const initialGrades = selectedQuestion.rubric_criteria.map(criteria => ({
        id: criteria.id,
        points: 0,
        feedback: ''
      }));
      setGrades(initialGrades);
    }
  }, [selectedQuestion]);

  useEffect(() => {
    // Calculate total score whenever grades change
    const total = grades.reduce((sum, grade) => sum + grade.points, 0);
    setTotalScore(total);
  }, [grades]);

  const updateGrade = (criteriaId: string, points: number, feedback: string) => {
    setGrades(prev => prev.map(grade => 
      grade.id === criteriaId 
        ? { ...grade, points, feedback }
        : grade
    ));
  };

  const handleSaveGrades = async () => {
    if (!currentResponse || !selectedQuestion) {
      toast.error('Please select a response to grade');
      return;
    }

    setSaving(true);
    try {
      // In a real implementation, this would save to the database
      toast.success(`Grades saved for ${currentResponse.student_name}`);
      
      // Move to next response automatically
      const currentIndex = responses.findIndex(r => r.id === currentResponse.id);
      if (currentIndex < responses.length - 1) {
        setCurrentResponse(responses[currentIndex + 1]);
        // Reset grades for next student
        const initialGrades = selectedQuestion.rubric_criteria.map(criteria => ({
          id: criteria.id,
          points: 0,
          feedback: ''
        }));
        setGrades(initialGrades);
        setOverallFeedback('');
      }
    } catch (error) {
      toast.error('Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const getMaxPoints = () => {
    return selectedQuestion?.max_points || 0;
  };

  const getScorePercentage = () => {
    const maxPoints = getMaxPoints();
    return maxPoints > 0 ? Math.round((totalScore / maxPoints) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Essay Grading Interface</h1>
          <p className="text-muted-foreground">Grade essay responses using structured rubrics</p>
        </div>
      </div>

      {/* Question Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Select Question to Grade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={(value) => setSelectedQuestion(mockQuestions.find(q => q.id === value) || null)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a question to grade..." />
            </SelectTrigger>
            <SelectContent>
              {mockQuestions.map(question => (
                <SelectItem key={question.id} value={question.id}>
                  {question.question_text.substring(0, 80)}...
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedQuestion && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Question:</h3>
              <p className="text-sm">{selectedQuestion.question_text}</p>
              <Badge className="mt-2">Max Points: {selectedQuestion.max_points}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedQuestion && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Student Response Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Student Responses</CardTitle>
              <div className="flex gap-2 flex-wrap">
                {responses.map(response => (
                  <Button
                    key={response.id}
                    variant={currentResponse?.id === response.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentResponse(response)}
                  >
                    {response.student_name}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {currentResponse && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{currentResponse.student_name}</h3>
                      <p className="text-sm text-muted-foreground">ID: {currentResponse.student_id}</p>
                    </div>
                    <Badge variant="secondary">
                      Submitted: {new Date(currentResponse.submitted_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label>Student Response:</Label>
                    <div className="mt-2 p-4 bg-muted rounded-lg max-h-80 overflow-y-auto">
                      <p className="text-sm leading-relaxed">{currentResponse.response_text}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grading Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Grading Rubric
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{totalScore}/{getMaxPoints()}</div>
                  <div className="text-sm text-muted-foreground">{getScorePercentage()}%</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedQuestion.rubric_criteria.map(criteria => {
                const grade = grades.find(g => g.id === criteria.id);
                return (
                  <div key={criteria.id} className="space-y-3 p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{criteria.name}</h4>
                      <p className="text-sm text-muted-foreground">{criteria.description}</p>
                      <Badge variant="outline" className="mt-1">Max: {criteria.max_points} pts</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Points</Label>
                        <Input
                          type="number"
                          min="0"
                          max={criteria.max_points}
                          value={grade?.points || 0}
                          onChange={(e) => updateGrade(
                            criteria.id, 
                            Math.min(parseInt(e.target.value) || 0, criteria.max_points),
                            grade?.feedback || ''
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Feedback</Label>
                        <Textarea
                          placeholder="Provide specific feedback for this criterion..."
                          value={grade?.feedback || ''}
                          onChange={(e) => updateGrade(
                            criteria.id,
                            grade?.points || 0,
                            e.target.value
                          )}
                          className="min-h-[60px]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="space-y-2">
                <Label>Overall Feedback</Label>
                <Textarea
                  placeholder="Provide overall feedback for this response..."
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <Button 
                onClick={handleSaveGrades}
                disabled={saving || !currentResponse}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Grades & Next Student'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}