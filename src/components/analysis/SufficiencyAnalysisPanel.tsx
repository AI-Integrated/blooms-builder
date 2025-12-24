import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import { SufficiencyAnalysis } from "@/services/analysis/sufficiencyAnalysis";

interface SufficiencyAnalysisPanelProps {
  analysis: SufficiencyAnalysis;
}

export function SufficiencyAnalysisPanel({ analysis }: SufficiencyAnalysisPanelProps) {


    // 🔹 Aggregate results per topic (FIXES counting issue)
  const topicSummary = analysis.results.reduce((acc, r) => {
    if (!acc[r.topic]) {
      acc[r.topic] = {
        topic: r.topic,
        required: 0,
        available: 0,
        gap: 0,
        sufficiency: "pass" as "pass" | "warning" | "fail",
      };
    }

    acc[r.topic].required += r.required;
    acc[r.topic].available += r.available;
    acc[r.topic].gap += r.gap;

    // Escalate severity: fail > warning > pass
    if (r.sufficiency === "fail") {
      acc[r.topic].sufficiency = "fail";
    } else if (
      r.sufficiency === "warning" &&
      acc[r.topic].sufficiency !== "fail"
    ) {
      acc[r.topic].sufficiency = "warning";
    }

    return acc;
  }, {} as Record<string, {
    topic: string;
    required: number;
    available: number;
    gap: number;
    sufficiency: "pass" | "warning" | "fail";
  }>);

  const topicList = Object.values(topicSummary);

  
  
  const getStatusIcon = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'fail':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Question Bank Sufficiency Analysis
          </CardTitle>
          <Badge 
            variant={analysis.overallStatus === 'pass' ? 'default' : analysis.overallStatus === 'warning' ? 'secondary' : 'destructive'}
            className="text-sm"
          >
            {analysis.overallStatus.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Sufficiency Score</span>
            <span className="text-2xl font-bold">{Math.round(analysis.overallScore)}%</span>
          </div>
          <Progress value={analysis.overallScore} className="h-2" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{analysis.totalAvailable} approved / {analysis.totalRequired} required</span>
            <span>{analysis.results.reduce((sum, r) => sum + r.gap, 0)} gap</span>
          </div>
        </div>


{/* Topic-Level Analysis */}
<div>
  <h4 className="text-sm font-semibold mb-3">Topic-Level Analysis</h4>

  <div className="space-y-2 max-h-96 overflow-y-auto">
    {topicList.map((topic) => (
      <div
        key={topic.topic}
        className={`p-3 rounded-lg border ${
          topic.sufficiency === "pass"
            ? "bg-green-100 dark:bg-green-900/30 border-green-300"
            : topic.sufficiency === "warning"
            ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300"
            : "bg-red-100 dark:bg-red-900/30 border-red-300"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {topic.sufficiency === "pass" && <CheckCircle className="w-4 h-4 text-green-600" />}
            {topic.sufficiency === "warning" && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
            {topic.sufficiency === "fail" && <XCircle className="w-4 h-4 text-red-600" />}

            <p className="font-medium text-sm capitalize">{topic.topic}</p>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold">
              {topic.available} / {topic.required}
            </p>
            {topic.gap > 0 && (
              <p className="text-xs text-red-600">Gap: {topic.gap}</p>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
</div>


        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Recommendations</h4>
            <div className="space-y-2">
              {analysis.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span className={rec.startsWith('✓') ? 'text-green-600' : rec.startsWith('Critical') ? 'text-red-600' : rec.startsWith('Warning') ? 'text-yellow-600' : ''}>
                    {rec}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
