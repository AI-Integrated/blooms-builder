import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shuffle, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

interface Question {
  id: string;
  topic: string;
  question_text: string;
  question_type: string;
  bloom_level: string;
  difficulty: string;
  choices?: string[];
  correct_answer?: string;
}

interface TestVersion {
  version: string;
  questions: Question[];
  answerKey: Record<string, string>;
}

interface MultiVersionTestGeneratorProps {
  onBack: () => void;
}

export default function MultiVersionTestGenerator({ onBack }: MultiVersionTestGeneratorProps) {
  const [versions, setVersions] = useState<TestVersion[]>([]);
  const [numberOfVersions, setNumberOfVersions] = useState(3);
  const [questionsPerVersion, setQuestionsPerVersion] = useState(20);
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
    setLoading(true);
    try {
      // Fetch approved questions
      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .or('approved.eq.true,created_by.eq.teacher')
        .limit(questionsPerVersion * numberOfVersions * 2); // Get more than needed

      if (error) throw error;

      if (!questions || questions.length < questionsPerVersion) {
        toast({
          title: "Insufficient Questions",
          description: `Need at least ${questionsPerVersion} approved questions to generate versions.`,
          variant: "destructive",
        });
        return;
      }

      const generatedVersions: TestVersion[] = [];
      
      for (let i = 0; i < numberOfVersions; i++) {
        const versionLabel = String.fromCharCode(65 + i); // A, B, C, etc.
        
        // Select random questions for this version
        const shuffledQuestions = shuffleArray(questions);
        const selectedQuestions = shuffledQuestions.slice(0, questionsPerVersion);
        
        // Shuffle the order of questions for this version
        const versionQuestions = shuffleArray(selectedQuestions as Question[]);

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
        title: "Versions Generated",
        description: `Successfully generated ${numberOfVersions} test versions.`,
      });
    } catch (error) {
      console.error('Error generating versions:', error);
      toast({
        title: "Error",
        description: "Failed to generate test versions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportVersion = async (version: TestVersion) => {
    try {
      // Save version to database
      const { error } = await supabase
        .from('generated_tests')
        .insert({
          title: `Test Version ${version.version}`,
          subject: 'Generated Test',
          num_versions: 1,
          versions: version.questions as unknown as Json,
          answer_keys: version.answerKey as unknown as Json,
          instructions: `Test Version ${version.version}`
        });

      if (error) throw error;

      toast({
        title: "Version Exported",
        description: `Test Version ${version.version} has been saved.`,
      });
    } catch (error) {
      console.error('Error exporting version:', error);
      toast({
        title: "Error",
        description: "Failed to export test version.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Multi-Version Test Generator</h1>
          <p className="text-muted-foreground">Generate multiple versions of the same test</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generation Settings</CardTitle>
          <CardDescription>Configure how many versions to generate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="versions">Number of Versions</Label>
              <Input
                id="versions"
                type="number"
                min="2"
                max="10"
                value={numberOfVersions}
                onChange={(e) => setNumberOfVersions(parseInt(e.target.value) || 2)}
              />
            </div>
            <div>
              <Label htmlFor="questions">Questions per Version</Label>
              <Input
                id="questions"
                type="number"
                min="5"
                max="100"
                value={questionsPerVersion}
                onChange={(e) => setQuestionsPerVersion(parseInt(e.target.value) || 20)}
              />
            </div>
          </div>
          
          <Button onClick={generateVersions} disabled={loading} className="gap-2">
            <Shuffle className="w-4 h-4" />
            {loading ? 'Generating...' : 'Generate Versions'}
          </Button>
        </CardContent>
      </Card>

      {versions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Generated Versions</h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {versions.map((version) => (
              <Card key={version.version}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Version {version.version}
                    <Badge variant="secondary">{version.questions.length} questions</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>Questions: {version.questions.length}</p>
                    <p>Topics covered: {new Set(version.questions.map(q => q.topic)).size}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Sample Questions:</h4>
                    <div className="space-y-1 text-xs">
                      {version.questions.slice(0, 3).map((q, index) => (
                        <div key={index} className="truncate">
                          {index + 1}. {q.question_text}
                        </div>
                      ))}
                      {version.questions.length > 3 && (
                        <div className="text-muted-foreground">
                          ... and {version.questions.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    onClick={() => exportVersion(version)}
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Version {version.version}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}