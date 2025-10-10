import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { ComplianceReport as ComplianceReportType } from "@/services/curriculum/complianceChecker";

interface ComplianceReportProps {
  report: ComplianceReportType;
}

export function ComplianceReport({ report }: ComplianceReportProps) {
  const scorePercentage = report.complianceScore * 100;
  
  const getComplianceColor = (score: number) => {
    if (score >= 0.8) return "text-success";
    if (score >= 0.6) return "text-warning";
    return "text-destructive";
  };

  const getComplianceIcon = (score: number) => {
    if (score >= 0.8) return <CheckCircle2 className="h-5 w-5 text-success" />;
    if (score >= 0.6) return <AlertTriangle className="h-5 w-5 text-warning" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  return (
    <div className="space-y-6">
      {/* Overall Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getComplianceIcon(report.complianceScore)}
            Overall Compliance Score
          </CardTitle>
          <CardDescription>
            {report.standardsTotal} total standards, {report.standardsCovered} covered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Coverage</span>
              <span className={`font-bold ${getComplianceColor(report.complianceScore)}`}>
                {scorePercentage.toFixed(1)}%
              </span>
            </div>
            <Progress value={scorePercentage} />
          </div>
          
          {report.recommendations.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Recommendations:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {report.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Coverage Details */}
      <Card>
        <CardHeader>
          <CardTitle>Standards Details</CardTitle>
          <CardDescription>Coverage breakdown by standard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
          {report.details.map((detail) => (
            <div key={detail.standardCode} className="p-3 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{detail.standardCode}</Badge>
                  <Badge variant={
                    detail.status === 'covered' ? 'default' :
                    detail.status === 'partial' ? 'secondary' : 'destructive'
                  }>
                    {detail.status}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {detail.questionCount} questions
                </span>
              </div>
              <p className="text-sm font-medium mb-1">{detail.standardTitle}</p>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Alignment strength:</span>
                <span className={detail.averageAlignment >= 0.7 ? "text-success" : "text-warning"}>
                  {(detail.averageAlignment * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Compliance Gaps */}
      {report.gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Compliance Gaps
            </CardTitle>
            <CardDescription>
              {report.gaps.length} issues identified
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {report.gaps.map((gap, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${
                    gap.severity === 'critical' ? 'border-destructive' :
                    gap.severity === 'moderate' ? 'border-warning' :
                    'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{gap.standard.code}</Badge>
                    <Badge variant={
                      gap.severity === 'critical' ? 'destructive' :
                      gap.severity === 'moderate' ? 'secondary' : 'outline'
                    }>
                      {gap.severity}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mb-1">{gap.description}</p>
                  <p className="text-xs text-muted-foreground">
                    💡 {gap.suggestedAction}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Alignment */}
      <Card>
        <CardHeader>
          <CardTitle>Average Alignment Strength</CardTitle>
          <CardDescription>Overall quality of standard mappings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">
              {(report.alignmentStrength * 100).toFixed(0)}%
            </div>
            <Progress value={report.alignmentStrength * 100} />
            <p className="text-sm text-muted-foreground mt-2">
              {report.alignmentStrength >= 0.8 ? 'Strong alignment' :
               report.alignmentStrength >= 0.6 ? 'Moderate alignment' :
               'Alignment needs improvement'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
