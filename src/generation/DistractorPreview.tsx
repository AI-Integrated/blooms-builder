import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle } from 'lucide-react';
import type { GeneratedDistractor } from '@/services/ai/distractorGenerator';

interface DistractorPreviewProps {
  distractors: GeneratedDistractor[];
  correctAnswer: string;
}

export default function DistractorPreview({ distractors, correctAnswer }: DistractorPreviewProps) {
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      plausible: 'bg-blue-500/20 text-blue-700',
      common_misconception: 'bg-orange-500/20 text-orange-700',
      partial_knowledge: 'bg-purple-500/20 text-purple-700',
      related_concept: 'bg-green-500/20 text-green-700'
    };
    return colors[type] || 'bg-muted';
  };

  const getTypeLabel = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <XCircle className="h-5 w-5" />
          Generated Distractors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-green-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-900">Correct Answer</span>
          </div>
          <p className="text-sm text-green-800">{correctAnswer}</p>
        </div>

        <div className="space-y-3">
          {distractors.map((distractor, index) => (
            <div key={index} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">Option {String.fromCharCode(66 + index)}</span>
                    <Badge className={getTypeColor(distractor.type)}>
                      {getTypeLabel(distractor.type)}
                    </Badge>
                  </div>
                  <p className="text-sm">{distractor.text}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quality Score</span>
                  <span className="font-medium">{(distractor.qualityScore * 100).toFixed(0)}%</span>
                </div>
                <Progress value={distractor.qualityScore * 100} className="h-2" />
              </div>

              <div className="text-sm text-muted-foreground italic">
                {distractor.rationale}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Quality Summary</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Average Quality:</span>{' '}
              <span className="font-medium">
                {((distractors.reduce((sum, d) => sum + d.qualityScore, 0) / distractors.length) * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Options:</span>{' '}
              <span className="font-medium">{distractors.length + 1}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
