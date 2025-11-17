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

interface TestItem {
  question_text?: string;
  question?: string;
  question_type?: string;
  type?: string;
  choices?: string[];
  options?: string[];
  correct_answer?: string | number;
  correctAnswer?: string | number;
  points?: number;
  difficulty?: string;
  bloom_level?: string;
  topic?: string;
}

export default function GeneratedTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { exportTestQuestions } = usePDFExport();
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  useEffect(() => {
    if (testId) {
      fetchTest();
    }
  }, [testId]);

  const fetchTest = async () => {
    try {
      setLoading(true);
      const data = await GeneratedTests.getById(testId!);
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

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-full" />
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
              <Button onClick={() => navigate("/teacher/tests")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items: TestItem[] = Array.isArray(test.items) ? test.items : [];
  const totalPoints = items.reduce((sum, item) => sum + (item.points || 1), 0);

  return (
    <div className="container mx-auto py-8 space-y-6 print:py-4">
      {/* Action Buttons - Hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" onClick={() => navigate("/teacher/tests")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tests
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
      <Card className="print:shadow-none print:border-none">
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

          {/* Questions */}
          <div className="space-y-6">
            {items.map((item, index) => (
              <QuestionItem
                key={index}
                item={item}
                number={index + 1}
                showAnswer={showAnswerKey}
              />
            ))}
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="font-semibold">{index + 1}.</span>
                  <span className="text-primary font-medium">
                    {formatAnswer(item)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
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
  const questionType = item.question_type || item.type || '';
  const options = item.choices || item.options || [];
  const correctAnswer = item.correct_answer ?? item.correctAnswer;

  return (
    <div className="border rounded-lg p-4 space-y-3 print:break-inside-avoid">
      {/* Question Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <span className="font-bold text-lg">{number}.</span>
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
      <div className="ml-6">
        {(questionType === "mcq" || questionType === "multiple-choice") && options.length > 0 && (
          <div className="space-y-2">
            {options.map((option, idx) => {
              const isCorrect = correctAnswer === idx || correctAnswer === String.fromCharCode(65 + idx);
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-2 rounded ${
                    showAnswer && isCorrect
                      ? "bg-green-50 border border-green-300"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span className="font-medium min-w-[24px]">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span className="text-sm">{option}</span>
                </div>
              );
            })}
          </div>
        )}

        {(questionType === "true_false" || questionType === "true-false") && (
          <div className="space-y-2">
            {["True", "False"].map((option, idx) => {
              const isCorrect =
                (correctAnswer === "true" && option === "True") ||
                (correctAnswer === "false" && option === "False") ||
                (correctAnswer === "True" && option === "True") ||
                (correctAnswer === "False" && option === "False") ||
                correctAnswer === idx;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded ${
                    showAnswer && isCorrect
                      ? "bg-green-50 border border-green-300"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <input type="radio" disabled className="print:hidden" />
                  <span className="text-sm">{option}</span>
                </div>
              );
            })}
          </div>
        )}

        {(questionType === "short_answer" || questionType === "fill-blank") && (
          <div className="border-b-2 border-dashed border-muted-foreground/30 py-2">
            {showAnswer && (
              <span className="text-primary font-medium">
                Answer: {correctAnswer}
              </span>
            )}
          </div>
        )}

        {questionType === "essay" && (
          <div className="space-y-2">
            <div className="border rounded p-4 min-h-[100px] bg-muted/10">
              <p className="text-xs text-muted-foreground italic">
                Write your answer here...
              </p>
            </div>
            {showAnswer && correctAnswer && (
              <div className="text-sm text-muted-foreground">
                <strong>Key Points:</strong> {correctAnswer}
              </div>
            )}
          </div>
        )}

        {questionType === "matching" && (
          <div className="text-sm text-muted-foreground italic">
            Match the items from Column A to Column B
          </div>
        )}
      </div>

      {/* Metadata footer */}
      {(item.topic || item.bloom_level) && (
        <div className="flex gap-2 text-xs text-muted-foreground ml-6 print:hidden">
          {item.topic && <span>Topic: {item.topic}</span>}
          {item.bloom_level && <span>• Bloom: {item.bloom_level}</span>}
        </div>
      )}
    </div>
  );
}

function formatAnswer(item: TestItem): string {
  const questionType = item.question_type || item.type || '';
  const correctAnswer = item.correct_answer ?? item.correctAnswer;
  
  if ((questionType === "mcq" || questionType === "multiple-choice") && typeof correctAnswer === "number") {
    return String.fromCharCode(65 + correctAnswer);
  }
  if (questionType === "true_false" || questionType === "true-false") {
    if (correctAnswer === "true" || correctAnswer === "True" || correctAnswer === 0) return "True";
    if (correctAnswer === "false" || correctAnswer === "False" || correctAnswer === 1) return "False";
  }
  return String(correctAnswer || "N/A");
}
