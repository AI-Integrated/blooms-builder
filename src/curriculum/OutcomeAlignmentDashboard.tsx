import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, TrendingUp, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react';
import { alignToOutcomes, generateAlignmentReport, type LearningOutcome, type AlignmentResult } from '@/services/curriculum/outcomeAligner';
import { toast } from 'sonner';

interface OutcomeAlignmentDashboardProps {
  questions: any[];
  onRefresh?: () => void;
}

export function OutcomeAlignmentDashboard({ questions, onRefresh }: OutcomeAlignmentDashboardProps) {
  const [outcomes, setOutcomes] = useState<LearningOutcome[]>([]);
  const [alignmentResults, setAlignmentResults] = useState<AlignmentResult[]>([]);
  const [overallReport, setOverallReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Example outcomes - in production, load from database
  useEffect(() => {
    // Load sample outcomes
    const sampleOutcomes: LearningOutcome[] = [
      {
        id: '1',
        code: 'LO-1',
        description: 'Demonstrate understanding of basic concepts',
        bloomLevel: 'understanding',
        knowledgeDimension: 'conceptual',
        topics: ['fundamentals', 'theory']
      },
      {
        id: '2',
        code: 'LO-2',
        description: 'Apply knowledge to solve problems',
        bloomLevel: 'applying',
        knowledgeDimension: 'procedural',
        topics: ['problem solving', 'application']
      },
      {
        id: '3',
        code: 'LO-3',
        description: 'Analyze complex scenarios',
        bloomLevel: 'analyzing',
        knowledgeDimension: 'metacognitive',
        topics: ['analysis', 'critical thinking']
      }
    ];
    setOutcomes(sampleOutcomes);
  }, []);

  const handleAnalyzeAlignment = async () => {
    if (outcomes.length === 0 || questions.length === 0) {
      toast.error('Need both outcomes and questions to analyze');
      return;
    }

    setLoading(true);
    try {
      const results = await alignToOutcomes(questions, outcomes);
      setAlignmentResults(results);
      
      const report = generateAlignmentReport(results);
      setOverallReport(report);
      
      toast.success('Alignment analysis complete');
    } catch (error) {
      console.error('Error analyzing alignment:', error);
      toast.error('Failed to analyze alignment');
    } finally {
      setLoading(false);
    }
  };

  const getAlignmentColor = (score: number) => {
    if (score >= 0.7) return 'text-success';
    if (score >= 0.4) return 'text-warning';
    return 'text-destructive';
  };

  const getAlignmentBadge = (score: number) => {
    if (score >= 0.7) return { variant: 'default' as const, label: 'Well Aligned' };
    if (score >= 0.4) return { variant: 'secondary' as const, label: 'Needs Work' };
    return { variant: 'destructive' as const, label: 'Critical' };
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Learning Outcome Alignment
          </CardTitle>
          <CardDescription>
            Analyze how well your questions align with intended learning outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              onClick={handleAnalyzeAlignment}
              disabled={loading || questions.length === 0}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analyze Alignment
            </Button>
            <Button variant="outline" onClick={onRefresh}>
              Refresh Data
            </Button>
          </div>
          {questions.length === 0 && (
            <Alert className="mt-4">
              <AlertDescription>
                No questions available for alignment analysis
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Overall Report */}
      {overallReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getAlignmentColor(overallReport.overallScore)}`}>
                {(overallReport.overallScore * 100).toFixed(0)}%
              </div>
              <Progress value={overallReport.overallScore * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Well Aligned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">{overallReport.wellAligned}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">outcomes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Needs Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-warning" />
                <span className="text-2xl font-bold">{overallReport.needsImprovement}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">outcomes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold">{overallReport.critical}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">outcomes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Results */}
      {alignmentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outcome Details</CardTitle>
            <CardDescription>
              Detailed alignment analysis for each learning outcome
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="outcomes">
              <TabsList>
                <TabsTrigger value="outcomes">By Outcome</TabsTrigger>
                <TabsTrigger value="gaps">Gaps & Issues</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>

              <TabsContent value="outcomes" className="mt-4">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {alignmentResults.map((result) => {
                      const outcome = outcomes.find(o => o.id === result.outcomeId);
                      if (!outcome) return null;
                      const badge = getAlignmentBadge(result.alignmentScore);

                      return (
                        <Card key={result.outcomeId}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">{outcome.code}</Badge>
                                  <Badge variant={badge.variant}>{badge.label}</Badge>
                                </div>
                                <CardTitle className="text-base">{outcome.description}</CardTitle>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="secondary">{outcome.bloomLevel}</Badge>
                                  {outcome.knowledgeDimension && (
                                    <Badge variant="secondary">{outcome.knowledgeDimension}</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-2xl font-bold ${getAlignmentColor(result.alignmentScore)}`}>
                                  {(result.alignmentScore * 100).toFixed(0)}%
                                </div>
                                <p className="text-xs text-muted-foreground">alignment</p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <Progress value={result.alignmentScore * 100} />
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium mb-1">Mapped Questions</p>
                              <p className="text-sm text-muted-foreground">
                                {result.mappedQuestions.length} question(s) aligned to this outcome
                              </p>
                            </div>

                            {result.gaps.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-warning" />
                                  Gaps Identified
                                </p>
                                <ul className="space-y-1">
                                  {result.gaps.map((gap, idx) => (
                                    <li key={idx} className="text-sm text-muted-foreground">
                                      • {gap}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {result.recommendations.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-1">Recommendations</p>
                                <ul className="space-y-1">
                                  {result.recommendations.map((rec, idx) => (
                                    <li key={idx} className="text-sm text-muted-foreground">
                                      💡 {rec}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="gaps" className="mt-4">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {alignmentResults
                      .filter(r => r.gaps.length > 0)
                      .map(result => {
                        const outcome = outcomes.find(o => o.id === result.outcomeId);
                        return (
                          <div key={result.outcomeId} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{outcome?.code}</Badge>
                              <AlertTriangle className="h-4 w-4 text-warning" />
                            </div>
                            <p className="text-sm font-medium mb-2">{outcome?.description}</p>
                            <ul className="space-y-1">
                              {result.gaps.map((gap, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground">• {gap}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    {alignmentResults.filter(r => r.gaps.length > 0).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No gaps identified. All outcomes are well covered!</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="recommendations" className="mt-4">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {alignmentResults
                      .filter(r => r.recommendations.length > 0)
                      .map(result => {
                        const outcome = outcomes.find(o => o.id === result.outcomeId);
                        return (
                          <div key={result.outcomeId} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{outcome?.code}</Badge>
                            </div>
                            <p className="text-sm font-medium mb-2">{outcome?.description}</p>
                            <ul className="space-y-1">
                              {result.recommendations.map((rec, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground">💡 {rec}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {overallReport && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{overallReport.summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
