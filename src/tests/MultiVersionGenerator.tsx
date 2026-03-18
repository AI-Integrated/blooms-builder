import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Sparkles, Download, Eye } from 'lucide-react';
import {
  generateMultipleVersions,
  saveTestVersions,
  fetchQuestionsFromTOS,
  type Question,
  type TestVersion,
  type GenerationConfig
} from '@/services/tests/multiVersionGenerator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface MultiVersionGeneratorProps {
  tosId?: string;
  questionIds?: string[];
  onComplete?: (parentId: string, versionIds: string[]) => void;
  onBack?: () => void;
}

export function MultiVersionGenerator({ 
  tosId, 
  questionIds, 
  onComplete,
  onBack 
}: MultiVersionGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [versions, setVersions] = useState<TestVersion[]>([]);
  
  const [config, setConfig] = useState<GenerationConfig>({
    numberOfVersions: 3,
    shuffleQuestions: true,
    shuffleChoices: true,
    ensureBalance: true,
    tosId
  });

  useEffect(() => {
    loadQuestions();
  }, [tosId, questionIds]);

  const loadQuestions = async () => {
    if (!tosId) return;

    setLoading(true);
    try {
      const data = await fetchQuestionsFromTOS(tosId);
      setQuestions(data);
      
      if (data.length === 0) {
        toast.error('No approved questions found for this TOS');
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (questions.length === 0) {
      toast.error('No questions available for generation');
      return;
    }

    if (config.numberOfVersions < 2 || config.numberOfVersions > 8) {
      toast.error('Number of versions must be between 2 and 8');
      return;
    }

    setLoading(true);

    try {
      const generatedVersions = await generateMultipleVersions(questions, config);
      setVersions(generatedVersions);
      toast.success(`Generated ${generatedVersions.length} test versions successfully`);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate test versions');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (versions.length === 0) {
      toast.error('No versions to save');
      return;
    }

    setLoading(true);

    try {
      const result = await saveTestVersions(versions, config);
      
      if (result.success && result.parentId) {
        toast.success('Test versions saved successfully');
        onComplete?.(result.parentId, result.versionIds);
      } else {
        toast.error(result.error || 'Failed to save test versions');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save test versions');
    } finally {
      setLoading(false);
    }
  };

  const getDistributionStats = (version: TestVersion) => {
    const topics = version.questions.reduce((acc, q) => {
      acc[q.topic] = (acc[q.topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const difficulty = version.questions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bloom = version.questions.reduce((acc, q) => {
      acc[q.bloom_level] = (acc[q.bloom_level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { topics, difficulty, bloom };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {onBack && (
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            Multi-Version Test Generator
          </h1>
          <p className="text-muted-foreground">Generate secure, balanced test versions automatically</p>
        </div>
        <Badge variant="outline" className="text-lg">
          {questions.length} Questions Available
        </Badge>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Generation Configuration</CardTitle>
          <CardDescription>Configure how test versions will be generated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="numVersions">Number of Versions</Label>
              <Input
                id="numVersions"
                type="number"
                min={2}
                max={8}
                value={config.numberOfVersions}
                onChange={(e) => setConfig({ ...config, numberOfVersions: parseInt(e.target.value) || 2 })}
              />
              <p className="text-xs text-muted-foreground">Between 2 and 8 versions</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="shuffleQuestions" className="cursor-pointer">
                  Shuffle Question Order
                </Label>
                <Switch
                  id="shuffleQuestions"
                  checked={config.shuffleQuestions}
                  onCheckedChange={(checked) => setConfig({ ...config, shuffleQuestions: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="shuffleChoices" className="cursor-pointer">
                  Shuffle Answer Choices
                </Label>
                <Switch
                  id="shuffleChoices"
                  checked={config.shuffleChoices}
                  onCheckedChange={(checked) => setConfig({ ...config, shuffleChoices: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="ensureBalance" className="cursor-pointer">
                  Ensure Balance Check
                </Label>
                <Switch
                  id="ensureBalance"
                  checked={config.ensureBalance}
                  onCheckedChange={(checked) => setConfig({ ...config, ensureBalance: checked })}
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={loading || questions.length === 0}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate {config.numberOfVersions} Versions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Versions Preview */}
      {versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Versions Preview</CardTitle>
            <CardDescription>
              Review the generated test versions before saving
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
              {versions.map((version, idx) => {
                const stats = getDistributionStats(version);
                
                return (
                  <AccordionItem key={idx} value={`version-${idx}`}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-4 w-full">
                        <Badge variant="secondary">Version {version.version_label}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {version.questions.length} questions
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 p-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Topic Distribution</Label>
                            <div className="space-y-1">
                              {Object.entries(stats.topics).map(([topic, count]) => (
                                <div key={topic} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{topic}:</span>
                                  <Badge variant="outline" className="text-xs">{count}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Difficulty</Label>
                            <div className="space-y-1">
                              {Object.entries(stats.difficulty).map(([level, count]) => (
                                <div key={level} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{level}:</span>
                                  <Badge variant="outline" className="text-xs">{count}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Bloom's Taxonomy</Label>
                            <div className="space-y-1">
                              {Object.entries(stats.bloom).map(([level, count]) => (
                                <div key={level} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{level}:</span>
                                  <Badge variant="outline" className="text-xs">{count}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">First 3 Questions (Preview)</Label>
                          <div className="space-y-2">
                            {version.questions.slice(0, 3).map((q, qIdx) => (
                              <div key={qIdx} className="p-3 bg-muted rounded text-sm">
                                <p className="font-medium">{qIdx + 1}. {q.question_text}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">{q.topic}</Badge>
                                  <Badge variant="outline" className="text-xs">{q.bloom_level}</Badge>
                                  <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                disabled={loading}
                className="flex-1"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Save All Versions
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
