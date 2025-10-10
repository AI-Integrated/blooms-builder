import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import type { AlignmentResult } from '@/services/ai/objectiveAligner';

interface ObjectiveAlignmentProps {
  alignment: AlignmentResult;
}

export default function ObjectiveAlignment({ alignment }: ObjectiveAlignmentProps) {
  const getAlignmentColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBadge = (quality: number) => {
    if (quality >= 0.8) return { label: 'Excellent', color: 'bg-green-500/20 text-green-700' };
    if (quality >= 0.6) return { label: 'Good', color: 'bg-yellow-500/20 text-yellow-700' };
    return { label: 'Needs Work', color: 'bg-red-500/20 text-red-700' };
  };

  const qualityBadge = getQualityBadge(alignment.overallQuality);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Learning Objective Alignment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Overall Alignment Quality</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{(alignment.overallQuality * 100).toFixed(0)}%</span>
              <Badge className={qualityBadge.color}>{qualityBadge.label}</Badge>
            </div>
          </div>
          
          {alignment.bestAlignment ? (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Best Match</p>
              <p className="font-medium">{alignment.bestAlignment.objective.code}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">No Alignment</span>
            </div>
          )}
        </div>

        {alignment.bestAlignment && (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{alignment.bestAlignment.objective.code}</span>
                    <Badge variant="outline">{alignment.bestAlignment.objective.bloomLevel}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {alignment.bestAlignment.objective.description}
                  </p>
                </div>
                <div className={`text-xl font-bold ${getAlignmentColor(alignment.bestAlignment.score)}`}>
                  {(alignment.bestAlignment.score * 100).toFixed(0)}%
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Bloom's Alignment</span>
                    <span className="font-medium">{(alignment.bestAlignment.bloomAlignment * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={alignment.bestAlignment.bloomAlignment * 100} className="h-1.5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Knowledge Alignment</span>
                    <span className="font-medium">{(alignment.bestAlignment.knowledgeAlignment * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={alignment.bestAlignment.knowledgeAlignment * 100} className="h-1.5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Content Alignment</span>
                    <span className="font-medium">{(alignment.bestAlignment.contentAlignment * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={alignment.bestAlignment.contentAlignment * 100} className="h-1.5" />
                </div>
              </div>

              <p className="text-sm text-muted-foreground italic">
                {alignment.bestAlignment.rationale}
              </p>
            </div>
          </div>
        )}

        {alignment.alignments.length > 1 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Additional Alignments ({alignment.alignments.length - 1})
            </h4>
            <div className="space-y-2">
              {alignment.alignments.slice(1, 4).map((align, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{align.objective.code}</span>
                      <Badge variant="outline" className="text-xs">{align.objective.bloomLevel}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {align.objective.description}
                    </p>
                  </div>
                  <div className={`text-sm font-medium ml-4 ${getAlignmentColor(align.score)}`}>
                    {(align.score * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {alignment.recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {alignment.overallQuality >= 0.7 ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
              <h4 className="text-sm font-medium">Recommendations</h4>
            </div>
            <ul className="space-y-1">
              {alignment.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  • {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
