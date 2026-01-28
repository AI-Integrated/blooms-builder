import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer, Download, Key } from "lucide-react";
import { GeneratedTests } from "@/services/db/generatedTests";
import { useToast } from "@/hooks/use-toast";
import { usePDFExport } from "@/hooks/usePDFExport";
import { Skeleton } from "@/components/ui/skeleton";
import { useTestAutoRepair } from "@/hooks/useTestAutoRepair";
import { ExamPrintTemplate } from "@/components/print/ExamPrintTemplate";

interface TestItem {
  question_text?: string;
  question?: string;
  question_type?: string;
  type?: string;
  choices?: Record<string, string> | string[];
  options?: string[];
  correct_answer?: string | number;
  correctAnswer?: string | number;
  points?: number;
  difficulty?: string;
  bloom_level?: string;
  topic?: string;
}

interface GroupedQuestions {
  mcq: TestItem[];
  secondary: TestItem[];
  essay: TestItem[];
  secondaryType: 'true_false' | 'short_answer' | null;
}

function groupQuestionsByType(items: TestItem[]): GroupedQuestions {
  const mcq: TestItem[] = [];
  const trueFalse: TestItem[] = [];
  const shortAnswer: TestItem[] = [];
  const essay: TestItem[] = [];

  for (const item of items) {
    const type = (item.question_type || item.type || '').toLowerCase();
    if (type === 'mcq' || type === 'multiple-choice' || type === 'multiple_choice') {
      mcq.push(item);
    } else if (type === 'true_false' || type === 'true-false' || type === 'truefalse') {
      trueFalse.push(item);
    } else if (type === 'short_answer' || type === 'fill-blank' || type === 'fill_blank' || type === 'identification') {
      shortAnswer.push(item);
    } else if (type === 'essay') {
      essay.push(item);
    }
  }

  let secondaryType: 'true_false' | 'short_answer' | null = null;
  let secondary: TestItem[] = [];
  
  if (trueFalse.length > 0 && shortAnswer.length === 0) {
    secondaryType = 'true_false';
    secondary = trueFalse;
  } else if (shortAnswer.length > 0 && trueFalse.length === 0) {
    secondaryType = 'short_answer';
    secondary = shortAnswer;
  } else if (trueFalse.length > 0 && shortAnswer.length > 0) {
    if (trueFalse.length >= shortAnswer.length) {
      secondaryType = 'true_false';
      secondary = trueFalse;
    } else {
      secondaryType = 'short_answer';
      secondary = shortAnswer;
    }
  }

  return { mcq, secondary, essay, secondaryType };
}

export default function GeneratedTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { exportTestQuestions } = usePDFExport();
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const { checkAndRepair, isRepairing } = useTestAutoRepair(testId);

  useEffect(() => {
    if (testId) {
      fetchTest();
    }
  }, [testId]);

  const fetchTest = async () => {
    try {
      setLoading(true);
      let data = await GeneratedTests.getById(testId!);
      
      if (data) {
        data = await checkAndRepair(data);
      }
      
      setTest(data);
    } catch (error) {
      console.error("Error fetching test:", error);
      toast({
        title: "Error",
        description: "Failed to load test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async () => {
    if (!test) return;
    const success = await exportTestQuestions(
      test.items || [],
      test.title || "Generated Test"
    );
    if (success) {
      toast({
        title: "Export Successful",
        description: "Test has been exported to PDF",
      });
    } else {
      toast({
        title: "Export Failed",
        description: "Failed to export test",
        variant: "destructive",
      });
    }
  };

  // Fixed: Navigate back to my-tests instead of non-existent /teacher/tests
  const handleBack = () => {
    navigate("/teacher/my-tests");
  };

  if (loading || isRepairing) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="text-center text-muted-foreground">
          {isRepairing ? 'Repairing incomplete test...' : 'Loading test...'}
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Test not found</p>
            <div className="flex justify-center mt-4">
              <Button onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to My Tests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items: TestItem[] = Array.isArray(test.items) ? test.items : [];
  const totalPoints = items.reduce((sum, item) => sum + (item.points || 1), 0);
  const groupedQuestions = groupQuestionsByType(items);

  const mcqStart = 1;
  const secondaryStart = mcqStart + groupedQuestions.mcq.length;
  const essayStart = secondaryStart + groupedQuestions.secondary.length;

  const getSectionBTitle = () => {
    if (groupedQuestions.secondaryType === 'true_false') {
      return "Section B: True or False";
    }
    return "Section B: Fill in the Blank / Short Answer";
  };

  const getSectionBInstruction = () => {
    if (groupedQuestions.secondaryType === 'true_false') {
      return "Write TRUE if the statement is correct, FALSE if incorrect.";
    }
    return "Write the correct answer on the blank provided.";
  };

  return (
    <>
      {/* Print-only exam template - hidden on screen, shown only when printing */}
      <ExamPrintTemplate test={test} showAnswerKey={showAnswerKey} />
      
      {/* Screen UI - hidden when printing */}
      <div className="container mx-auto py-8 space-y-6 screen-only">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Tests
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAnswerKey(!showAnswerKey)}>
            <Key className="w-4 h-4 mr-2" />
            {showAnswerKey ? "Hide" : "Show"} Answer Key
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Exam Paper */}
      <Card className="print:shadow-none print:border-none" id="test-content">
        <CardHeader className="text-center border-b print:border-black">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{test.title || "Examination"}</h1>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              {test.subject && <Badge variant="secondary">{test.subject}</Badge>}
              {test.course && <Badge variant="secondary">{test.course}</Badge>}
              {test.year_section && <Badge variant="secondary">{test.year_section}</Badge>}
              {test.exam_period && <Badge variant="secondary">{test.exam_period}</Badge>}
              {test.school_year && <Badge variant="secondary">SY {test.school_year}</Badge>}
            </div>
            
            {/* Student Info Section */}
            <div className="mt-4 pt-4 border-t text-left grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Name:</span>
                <span className="flex-1 border-b border-dashed border-muted-foreground"></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Date:</span>
                <span className="flex-1 border-b border-dashed border-muted-foreground"></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Section:</span>
                <span className="flex-1 border-b border-dashed border-muted-foreground"></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Score:</span>
                <span className="flex-1 border-b border-dashed border-muted-foreground"></span>
                <span>/ {totalPoints}</span>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground flex justify-between items-center pt-2">
              <span>Total Points: {totalPoints}</span>
              {test.time_limit && <span>Time Limit: {test.time_limit} minutes</span>}
              <span>Questions: {items.length}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Instructions */}
          {test.instructions && (
            <div className="bg-muted p-4 rounded-lg print:bg-gray-100">
              <h3 className="font-semibold mb-2">Instructions:</h3>
              <p className="text-sm">{test.instructions}</p>
            </div>
          )}

          <Separator />

          {/* Questions - 3 Sections */}
          <div className="space-y-8">
            {groupedQuestions.mcq.length > 0 && (
              <QuestionSection
                title="Section A: Multiple Choice Questions"
                instruction="Choose the best answer from the options provided. Write the letter of your answer on the space provided."
                items={groupedQuestions.mcq}
                startNumber={mcqStart}
                showAnswer={showAnswerKey}
              />
            )}
            
            {groupedQuestions.secondary.length > 0 && (
              <QuestionSection
                title={getSectionBTitle()}
                instruction={getSectionBInstruction()}
                items={groupedQuestions.secondary}
                startNumber={secondaryStart}
                showAnswer={showAnswerKey}
              />
            )}
            
            {groupedQuestions.essay.length > 0 && (
              <QuestionSection
                title="Section C: Essay Questions"
                instruction="Answer the following questions in complete sentences. Provide clear and concise explanations."
                items={groupedQuestions.essay}
                startNumber={essayStart}
                showAnswer={showAnswerKey}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Answer Key Section */}
      {showAnswerKey && (
        <Card className="print:shadow-none print:border-none print:break-before-page">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Answer Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupedQuestions.mcq.length > 0 && (
                <AnswerKeySection title="Multiple Choice" items={groupedQuestions.mcq} startNumber={mcqStart} />
              )}
              {groupedQuestions.secondary.length > 0 && (
                <AnswerKeySection 
                  title={groupedQuestions.secondaryType === 'true_false' ? 'True/False' : 'Short Answer'} 
                  items={groupedQuestions.secondary} 
                  startNumber={secondaryStart} 
                />
              )}
              {groupedQuestions.essay.length > 0 && (
                <AnswerKeySection title="Essay" items={groupedQuestions.essay} startNumber={essayStart} />
              )}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  );
}

function QuestionSection({ 
  title, 
  instruction, 
  items, 
  startNumber, 
  showAnswer 
}: { 
  title: string; 
  instruction: string; 
  items: TestItem[]; 
  startNumber: number; 
  showAnswer: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground italic">{instruction}</p>
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <QuestionItem
            key={index}
            item={item}
            number={startNumber + index}
            showAnswer={showAnswer}
          />
        ))}
      </div>
    </div>
  );
}

function AnswerKeySection({ title, items, startNumber }: { title: string; items: TestItem[]; startNumber: number }) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
            <span className="font-semibold">{startNumber + index}.</span>
            <span className="text-primary font-medium">
              {formatAnswer(item)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatAnswer(item: TestItem): string {
  const answer = item.correct_answer ?? item.correctAnswer;
  if (answer === undefined || answer === null) return '—';
  return String(answer);
}

function QuestionItem({ item, number, showAnswer }: { item: TestItem; number: number; showAnswer: boolean }) {
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "average":
        return "bg-yellow-100 text-yellow-800";
      case "difficult":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const questionText = item.question_text || item.question || '';
  const questionType = (item.question_type || item.type || '').toLowerCase();
  const correctAnswer = item.correct_answer ?? item.correctAnswer;
  
  const getMCQOptions = (): { key: string; text: string }[] => {
    const choices = item.choices || item.options;
    if (!choices) return [];
    
    if (typeof choices === 'object' && !Array.isArray(choices)) {
      return ['A', 'B', 'C', 'D']
        .filter(key => choices[key])
        .map(key => ({ key, text: choices[key] as string }));
    }
    
    if (Array.isArray(choices)) {
      return choices.map((text, idx) => ({
        key: String.fromCharCode(65 + idx),
        text: String(text)
      }));
    }
    
    return [];
  };

  const mcqOptions = getMCQOptions();

  return (
    <div className="border rounded-lg p-4 space-y-3 print:break-inside-avoid">
      {/* Question Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <span className="font-bold text-lg min-w-[30px]">{number}.</span>
          <div className="flex-1">
            <p className="text-sm leading-relaxed">{questionText}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {item.difficulty && (
            <Badge className={`text-xs ${getDifficultyColor(item.difficulty)}`}>
              {item.difficulty}
            </Badge>
          )}
          {item.points && (
            <Badge variant="outline" className="text-xs">
              {item.points} {item.points === 1 ? "pt" : "pts"}
            </Badge>
          )}
        </div>
      </div>

      {/* Question Content based on type */}
      <div className="ml-8">
        {/* MCQ with A, B, C, D options */}
        {(questionType === "mcq" || questionType === "multiple-choice" || questionType === "multiple_choice") && mcqOptions.length > 0 && (
          <div className="space-y-2">
            {mcqOptions.map((option) => {
              const isCorrect = 
                correctAnswer === option.key || 
                correctAnswer === option.key.toLowerCase();
              return (
                <div
                  key={option.key}
                  className={`flex items-start gap-2 p-2 rounded ${
                    showAnswer && isCorrect
                      ? "bg-green-50 border border-green-300"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span className="font-medium min-w-[24px]">
                    {option.key}.
                  </span>
                  <span className="text-sm">{option.text}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* True/False */}
        {(questionType === "true_false" || questionType === "true-false" || questionType === "truefalse") && (
          <div className="flex gap-4 mt-2">
            <div className={`px-4 py-2 border rounded ${
              showAnswer && String(correctAnswer).toLowerCase() === 'true' 
                ? "bg-green-50 border-green-300" 
                : ""
            }`}>
              TRUE
            </div>
            <div className={`px-4 py-2 border rounded ${
              showAnswer && String(correctAnswer).toLowerCase() === 'false' 
                ? "bg-green-50 border-green-300" 
                : ""
            }`}>
              FALSE
            </div>
          </div>
        )}

        {/* Short Answer / Fill in blank */}
        {(questionType === "short_answer" || questionType === "fill-blank" || questionType === "fill_blank" || questionType === "identification") && (
          <div className="mt-2">
            <div className="border-b-2 border-dashed w-48 h-8"></div>
            {showAnswer && correctAnswer && (
              <div className="mt-2 text-green-600 text-sm">
                Answer: {String(correctAnswer)}
              </div>
            )}
          </div>
        )}

        {/* Essay */}
        {questionType === "essay" && (
          <div className="mt-2 space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="border-b border-dashed h-6"></div>
            ))}
            {showAnswer && correctAnswer && (
              <div className="mt-2 text-green-600 text-sm bg-green-50 p-2 rounded">
                Sample Answer: {String(correctAnswer)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
