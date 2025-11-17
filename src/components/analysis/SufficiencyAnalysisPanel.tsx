import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import { SufficiencyAnalysis } from "@/services/analysis/sufficiencyAnalysis";

interface SufficiencyAnalysisPanelProps {
  analysis: SufficiencyAnalysis;
}

export function SufficiencyAnalysisPanel({ analysis }: SufficiencyAnalysisPanelProps) {
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
            <span>{analysis.totalRequired - analysis.totalAvailable} gap</span>
          </div>
        </div>

        {/* Bloom Level Distribution */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Bloom Level Coverage</h4>
          <div className="space-y-2">
            {analysis.bloomDistribution.map((bloom) => (
              <div key={bloom.level} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{bloom.level}</span>
                  <span className="text-muted-foreground">
                    {bloom.available} / {bloom.required} ({Math.round(bloom.percentage)}%)
                  </span>
                </div>
                <Progress value={bloom.percentage} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Results by Topic */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Topic-Level Analysis</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {analysis.results.map((result, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border ${getStatusColor(result.sufficiency)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {getStatusIcon(result.sufficiency)}
                    <div>
                      <p className="font-medium text-sm">{result.topic}</p>
                      <p className="text-xs capitalize text-muted-foreground">{result.bloomLevel}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {result.approved} / {result.required}
                    </p>
                    {result.gap > 0 && (
                      <p className="text-xs text-red-600">Gap: {result.gap}</p>
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
