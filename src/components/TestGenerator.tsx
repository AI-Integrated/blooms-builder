import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Eye, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RubricAnswerKey } from "./RubricAnswerKey";
import { supabase } from "@/integrations/supabase/client";

interface TestGeneratorProps {
  onBack: () => void;
}

interface GeneratedQuestion {
  id: number;
  text: string;
  type: 'Multiple Choice' | 'Essay' | 'True/False' | 'Fill in the Blank';
  options?: string[];
  correctAnswer?: string;
  topic: string;
  bloomLevel: string;
  difficulty: 'Easy' | 'Average' | 'Difficult';
}

export const TestGenerator = ({ onBack }: TestGeneratorProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTest, setGeneratedTest] = useState<GeneratedQuestion[] | null>(null);
  const [rubrics, setRubrics] = useState<Record<string, any>>({});

  // Mock TOS data - this would come from the actual TOS Builder
  const mockTOS = {
    subject: "IS 9 - System Analysis and Design",
    course: "BSIS",
    yearSection: "3A",
    examPeriod: "Final Examination",
    schoolYear: "2024-2025",
    totalItems: 50
  };

  // Mock generated test
  const mockGeneratedTest: GeneratedQuestion[] = [
    // Easy Questions (Part I)
    {
      id: 1,
      text: "Define the term 'requirement' in software engineering.",
      type: "Essay",
      topic: "Requirements Engineering",
      bloomLevel: "Remembering",
      difficulty: "Easy"
    },
    {
      id: 2,
      text: "Which of the following is NOT a characteristic of a good system requirement?",
      type: "Multiple Choice",
      options: ["Clear and unambiguous", "Testable", "Vague and general", "Feasible"],
      correctAnswer: "Vague and general",
      topic: "Requirements Engineering",
      bloomLevel: "Remembering",
      difficulty: "Easy"
    },
    // Average Questions (Part II)
    {
      id: 15,
      text: "Apply the concept of data flow to design a basic payroll system architecture.",
      type: "Essay",
      topic: "Data and Process Modeling",
      bloomLevel: "Applying",
      difficulty: "Average"
    },
    // Difficult Questions (Part III)
    {
      id: 43,
      text: "Evaluate the completeness of the following user story and propose improvements.",
      type: "Essay",
      topic: "Requirements Engineering",
      bloomLevel: "Evaluating",
      difficulty: "Difficult"
    }
  ];

  useEffect(() => {
    if (generatedTest) {
      loadRubrics();
    }
  }, [generatedTest]);

  const loadRubrics = async () => {
    try {
      const essayQuestions = generatedTest?.filter(q => q.type === 'Essay') || [];
      if (essayQuestions.length === 0) return;

      const questionIds = essayQuestions.map(q => q.id.toString());
      
      const { data: rubricsData, error } = await (supabase as any)
        .from('question_rubrics')
        .select(`
          *,
          criteria:rubric_criteria(*)
        `)
        .in('question_id', questionIds);

      if (error) throw error;

      const rubricsMap: Record<string, any> = {};
      (rubricsData || []).forEach(rubric => {
        rubricsMap[rubric.question_id] = {
          ...rubric,
          criteria: rubric.criteria.sort((a, b) => a.order_index - b.order_index)
        };
      });
      
      setRubrics(rubricsMap);
    } catch (error) {
      console.error('Error loading rubrics:', error);
    }
  };

  const handleGenerateTest = async () => {
    setIsGenerating(true);
    
    // Simulate test generation
    setTimeout(() => {
      setGeneratedTest(mockGeneratedTest);
      setIsGenerating(false);
      toast({
        title: "Success",
        description: "Test generated successfully!"
      });
    }, 2000);
  };

  const handleExportTest = () => {
    toast({
      title: "Success",
      description: "Test exported as PDF!"
    });
    // TODO: Implement PDF export
  };

  const handleExportAnswerKey = () => {
    toast({
      title: "Success", 
      description: "Answer key exported as PDF!"
    });
    // TODO: Implement answer key export
  };

  const easyQuestions = generatedTest?.filter(q => q.difficulty === 'Easy') || [];
  const averageQuestions = generatedTest?.filter(q => q.difficulty === 'Average') || [];
  const difficultQuestions = generatedTest?.filter(q => q.difficulty === 'Difficult') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Test Generator</h1>
          </div>
        </div>
      </div>

      {/* TOS Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current TOS Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Subject</p>
              <p className="font-medium">{mockTOS.subject}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Course & Section</p>
              <p className="font-medium">{mockTOS.course} - {mockTOS.yearSection}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Exam Period</p>
              <p className="font-medium">{mockTOS.examPeriod}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">School Year</p>
              <p className="font-medium">{mockTOS.schoolYear}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="font-medium">{mockTOS.totalItems}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generation Controls */}
      {!generatedTest && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Generate Test Questions</h3>
                <p className="text-muted-foreground">
                  Click below to automatically generate {mockTOS.totalItems} test questions based on your TOS matrix.
                </p>
              </div>
              <Button 
                size="lg" 
                onClick={handleGenerateTest}
                disabled={isGenerating}
                className="px-8"
              >
                {isGenerating ? "Generating..." : "🧠 Generate Test Questions"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Test Preview */}
      {generatedTest && (
        <div className="space-y-6">
          {/* Export Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 justify-center">
                <Button variant="outline" onClick={handleExportTest}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Test (PDF)
                </Button>
                <Button variant="outline" onClick={handleExportAnswerKey}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Answer Key (PDF)
                </Button>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Content */}
          <Card>
            <CardHeader>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">AGUSAN DEL SUR STATE COLLEGE OF AGRICULTURE AND TECHNOLOGY</h2>
                <p className="text-lg">College of Computing and Information Sciences</p>
                <Separator className="my-4" />
                <div className="space-y-1">
                  <p><strong>Subject:</strong> {mockTOS.subject}</p>
                  <p><strong>Examination:</strong> {mockTOS.examPeriod} | <strong>Year:</strong> {mockTOS.schoolYear} | <strong>Course:</strong> {mockTOS.course} – {mockTOS.yearSection}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Part I - Easy Questions */}
              {easyQuestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-green-600">Part I – Easy Questions</h3>
                  <div className="space-y-4">
                    {easyQuestions.slice(0, 5).map((question) => (
                      <div key={question.id} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="font-medium">{question.id}.</span>
                          <div className="flex-1">
                            <p>{question.text}</p>
                            {question.options && (
                              <div className="mt-2 space-y-1 ml-4">
                                {question.options.map((option, index) => (
                                  <p key={index} className="text-sm">
                                    {String.fromCharCode(65 + index)}. {option}
                                  </p>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{question.topic}</Badge>
                              <Badge variant="outline" className="text-xs">{question.bloomLevel}</Badge>
                            </div>
                            
                            {/* Show rubric for essay questions */}
                            {question.type === 'Essay' && rubrics[question.id.toString()] && (
                              <RubricAnswerKey
                                question={{
                                  id: question.id.toString(),
                                  question_text: question.text,
                                  question_type: 'essay',
                                  topic: question.topic,
                                  bloom_level: question.bloomLevel,
                                  difficulty: question.difficulty
                                }}
                                rubric={rubrics[question.id.toString()]}
                                questionNumber={question.id}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {easyQuestions.length > 5 && (
                      <p className="text-sm text-muted-foreground italic">
                        ... and {easyQuestions.length - 5} more easy questions
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Part II - Average Questions */}
              {averageQuestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-blue-600">Part II – Average Questions</h3>
                  <div className="space-y-4">
                    {averageQuestions.slice(0, 3).map((question) => (
                      <div key={question.id} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="font-medium">{question.id}.</span>
                          <div className="flex-1">
                            <p>{question.text}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{question.topic}</Badge>
                              <Badge variant="outline" className="text-xs">{question.bloomLevel}</Badge>
                            </div>
                            
                            {/* Show rubric for essay questions */}
                            {question.type === 'Essay' && rubrics[question.id.toString()] && (
                              <RubricAnswerKey
                                question={{
                                  id: question.id.toString(),
                                  question_text: question.text,
                                  question_type: 'essay',
                                  topic: question.topic,
                                  bloom_level: question.bloomLevel,
                                  difficulty: question.difficulty
                                }}
                                rubric={rubrics[question.id.toString()]}
                                questionNumber={question.id}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {averageQuestions.length > 3 && (
                      <p className="text-sm text-muted-foreground italic">
                        ... and {averageQuestions.length - 3} more average questions
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Part III - Difficult Questions */}
              {difficultQuestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-red-600">Part III – Difficult Questions</h3>
                  <div className="space-y-4">
                    {difficultQuestions.slice(0, 2).map((question) => (
                      <div key={question.id} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="font-medium">{question.id}.</span>
                          <div className="flex-1">
                            <p>{question.text}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{question.topic}</Badge>
                              <Badge variant="outline" className="text-xs">{question.bloomLevel}</Badge>
                            </div>
                            
                            {/* Show rubric for essay questions */}
                            {question.type === 'Essay' && rubrics[question.id.toString()] && (
                              <RubricAnswerKey
                                question={{
                                  id: question.id.toString(),
                                  question_text: question.text,
                                  question_type: 'essay',
                                  topic: question.topic,
                                  bloom_level: question.bloomLevel,
                                  difficulty: question.difficulty
                                }}
                                rubric={rubrics[question.id.toString()]}
                                questionNumber={question.id}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {difficultQuestions.length > 2 && (
                      <p className="text-sm text-muted-foreground italic">
                        ... and {difficultQuestions.length - 2} more difficult questions
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Test Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{easyQuestions.length}</p>
                  <p className="text-sm text-muted-foreground">Easy Questions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{averageQuestions.length}</p>
                  <p className="text-sm text-muted-foreground">Average Questions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{difficultQuestions.length}</p>
                  <p className="text-sm text-muted-foreground">Difficult Questions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};