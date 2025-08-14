import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Shuffle, 
  Download, 
  Settings, 
  CheckCircle
} from "lucide-react";

interface Question {
  id: string;
  topic: string;
  question_text: string;
  question_type: string;
  choices?: Record<string, string>;
  correct_answer?: string;
}

interface TestVersion {
  version: string;
  questions: Question[];
  answerKey: Record<string, string>;
}

export function MultiVersionTestGenerator() {
  const [testTitle, setTestTitle] = useState("");
  const [numVersions, setNumVersions] = useState(2);
  const [questionsPerTest, setQuestionsPerTest] = useState(10);
  const [versions, setVersions] = useState<TestVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const generateVersions = async () => {
    if (!testTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a test title",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('approved', true);

      if (error) throw error;

      if (!questions || questions.length < questionsPerTest) {
        toast({
          title: "Insufficient Questions",
          description: `Need at least ${questionsPerTest} questions. Found ${questions?.length || 0}.`,
          variant: "destructive",
        });
        return;
      }

      // Generate versions
      const generatedVersions: TestVersion[] = [];
      const versionLabels = ['A', 'B', 'C', 'D', 'E'];

      for (let i = 0; i < numVersions; i++) {
        const versionLabel = versionLabels[i];
        
        const shuffledQuestions = shuffleArray(questions);
        const selectedQuestions = shuffledQuestions.slice(0, questionsPerTest);
        const versionQuestions = shuffleArray(selectedQuestions as any);

        const answerKey: Record<string, string> = {};
        versionQuestions.forEach((q, index) => {
          answerKey[`${index + 1}`] = q.correct_answer || '';
        });

        generatedVersions.push({
          version: versionLabel,
          questions: versionQuestions,
          answerKey
        });
      }

      setVersions(generatedVersions);

      toast({
        title: "Success",
        description: `Generated ${numVersions} test versions successfully!`,
      });

    } catch (error) {
      console.error('Error generating test versions:', error);
      toast({
        title: "Error",
        description: "Failed to generate test versions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Multi-Version Test Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testTitle">Test Title</Label>
              <Input
                id="testTitle"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Enter test title..."
              />
            </div>
            
            <div>
              <Label htmlFor="numVersions">Number of Versions</Label>
              <Select value={numVersions.toString()} onValueChange={(value) => setNumVersions(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Versions</SelectItem>
                  <SelectItem value="3">3 Versions</SelectItem>
                  <SelectItem value="4">4 Versions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="questionsPerTest">Questions per Test</Label>
              <Input
                id="questionsPerTest"
                type="number"
                value={questionsPerTest}
                onChange={(e) => setQuestionsPerTest(parseInt(e.target.value) || 10)}
                min="1"
                max="100"
              />
            </div>
          </div>

          <Button 
            onClick={generateVersions} 
            disabled={loading}
            className="w-full gap-2"
          >
            <Settings className="h-4 w-4" />
            {loading ? 'Generating...' : 'Generate Test Versions'}
          </Button>
        </CardContent>
      </Card>

      {versions.length > 0 && (
        <div className="grid gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Generated Test Versions
          </h3>
          
          {versions.map((version) => (
            <Card key={version.version}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Version {version.version}</span>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {version.questions.length} questions
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}