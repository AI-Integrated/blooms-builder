import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { AssemblyResult } from "@/services/testAssembly/assemblyStrategies";

interface AssemblyPreviewProps {
  result: AssemblyResult;
}

export function AssemblyPreview({ result }: AssemblyPreviewProps) {
  const { selectedQuestions, metadata } = result;

  // Calculate distributions
  const topicCounts: Record<string, number> = {};
  const bloomCounts: Record<string, number> = {};
  const difficultyCounts = { easy: 0, medium: 0, hard: 0 };

  selectedQuestions.forEach(q => {
    topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
    bloomCounts[q.bloom_level] = (bloomCounts[q.bloom_level] || 0) + 1;
    if (q.difficulty in difficultyCounts) {
      difficultyCounts[q.difficulty as keyof typeof difficultyCounts]++;
    }
  });

  const total = selectedQuestions.length;

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {metadata.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {metadata.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Success indicators */}
      {metadata.constraintsSatisfied && metadata.warnings.length === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription>
            All constraints satisfied. Assembly ready for generation.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Balance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metadata.balanceScore?.toFixed(2) || 'N/A'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metadata.coverageScore?.toFixed(0) || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topic Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Topic Distribution</CardTitle>
          <CardDescription>Questions per topic</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(topicCounts).map(([topic, count]) => (
            <div key={topic}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">{topic}</span>
                <span className="text-sm text-muted-foreground">
                  {count} ({((count / total) * 100).toFixed(0)}%)
                </span>
              </div>
              <Progress value={(count / total) * 100} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bloom Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Bloom's Taxonomy Distribution</CardTitle>
          <CardDescription>Cognitive level breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(bloomCounts).map(([level, count]) => (
              <Badge key={level} variant="secondary">
                {level}: {count} ({((count / total) * 100).toFixed(0)}%)
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Difficulty Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Difficulty Distribution</CardTitle>
          <CardDescription>Question difficulty breakdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(difficultyCounts).map(([level, count]) => (
            <div key={level} className="flex items-center gap-4">
              <span className="capitalize font-medium min-w-[80px]">{level}</span>
              <Progress value={(count / total) * 100} className="flex-1" />
              <span className="text-sm text-muted-foreground min-w-[60px] text-right">
                {count} ({((count / total) * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
