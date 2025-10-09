import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Brain, Sparkles, FileCheck, Layers } from 'lucide-react';
import IntelligentGenerator from '@/components/generation/IntelligentGenerator';
import { TaxonomyMatrix } from '@/components/classification/TaxonomyMatrix';
import { SemanticSimilarity } from '@/components/classification/SemanticSimilarity';
import { ValidationWorkflow } from '@/components/classification/ValidationWorkflow';
import { ClassificationConfidence } from '@/components/classification/ClassificationConfidence';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function EnhancedClassification() {
  const [questionText, setQuestionText] = useState('');
  const [topic, setTopic] = useState('');
  const [classification, setClassification] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClassify = async () => {
    if (!questionText || !topic) {
      toast({
        title: "Missing Information",
        description: "Please provide both question text and topic.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-classify', {
        body: {
          questionText,
          questionType: 'multiple-choice',
          topic
        }
      });

      if (error) throw error;

      setClassification(data);
      toast({
        title: "Classification Complete",
        description: `Classified as ${data.classification.bloomLevel} with ${(data.confidence.overall * 100).toFixed(0)}% confidence.`
      });
    } catch (error) {
      console.error('Classification error:', error);
      toast({
        title: "Classification Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Enhanced AI Classification System</h1>
          <p className="text-muted-foreground">
            Advanced ML-powered question classification and generation
          </p>
        </div>
      </div>

      <Tabs defaultValue="classify" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="classify" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Classify
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="validate" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Validate
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classify" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ML-Based Question Classification</CardTitle>
              <CardDescription>
                Classify questions using advanced machine learning with confidence scoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Textarea
                  placeholder="Enter your question here..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Topic</Label>
                <Input
                  placeholder="e.g., Biology, Mathematics, History"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <Button onClick={handleClassify} disabled={loading} className="w-full">
                {loading ? 'Classifying...' : 'Classify Question'}
              </Button>

              {classification && (
                <div className="space-y-4 mt-6">
                  <ClassificationConfidence
                    confidence={classification.confidence}
                    classification={classification.classification}
                  />

                  {classification.similarities.hasDuplicates && (
                    <SemanticSimilarity
                      questionText={questionText}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Intelligent Question Generation</CardTitle>
              <CardDescription>
                Generate questions with AI-powered distractors and difficulty calibration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IntelligentGenerator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validate">
          <Card>
            <CardHeader>
              <CardTitle>Validation Workflow</CardTitle>
              <CardDescription>
                Review and validate AI classifications with human oversight
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ValidationWorkflow />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle>Two-Way Taxonomy Matrix</CardTitle>
              <CardDescription>
                Visualize question distribution across Bloom's taxonomy and knowledge dimensions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaxonomyMatrix 
                questions={[]} 
                onCellClick={(cogLevel, knowDim) => {
                  console.log('Matrix cell clicked:', cogLevel, knowDim);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
