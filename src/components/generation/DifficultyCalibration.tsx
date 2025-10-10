import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CalibrationResult } from '@/services/ai/difficultyCalibrator';

interface DifficultyCalibrationProps {
  calibration: CalibrationResult;
}

export default function DifficultyCalibration({ calibration }: DifficultyCalibrationProps) {
  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'bg-green-500/20 text-green-700',
      medium: 'bg-yellow-500/20 text-yellow-700',
      hard: 'bg-red-500/20 text-red-700'
    };
    return colors[difficulty] || 'bg-muted';
  };

  const getDifficultyChanged = () => {
    return calibration.originalDifficulty !== calibration.calibratedDifficulty;
  };

  const metrics = [
    { label: 'Readability', value: calibration.metrics.readabilityScore, description: 'Text complexity and reading level' },
    { label: 'Conceptual Complexity', value: calibration.metrics.conceptualComplexity, description: 'Depth of concepts involved' },
    { label: 'Cognitive Load', value: calibration.metrics.cognitiveLoad, description: 'Mental effort required' },
    { label: 'Prerequisites', value: calibration.metrics.prerequisiteKnowledge, description: 'Required background knowledge' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Difficulty Calibration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Original Difficulty</p>
            <Badge className={getDifficultyColor(calibration.originalDifficulty)}>
              {calibration.originalDifficulty.toUpperCase()}
            </Badge>
          </div>
          
          {getDifficultyChanged() && (
            <>
              <div className="flex items-center text-muted-foreground">
                <span className="text-2xl">→</span>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Calibrated Difficulty</p>
                <Badge className={getDifficultyColor(calibration.calibratedDifficulty)}>
                  {calibration.calibratedDifficulty.toUpperCase()}
                </Badge>
              </div>
            </>
          )}
          
          {!getDifficultyChanged() && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Well Calibrated</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Difficulty Metrics</h4>
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{metric.label}</span>
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                </div>
                <span className="font-medium">{(metric.value * 100).toFixed(0)}%</span>
              </div>
              <Progress value={metric.value * 100} className="h-2" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Overall Difficulty</h4>
            <span className="text-sm font-medium">
              {(calibration.metrics.overallDifficulty * 100).toFixed(0)}%
            </span>
          </div>
          <Progress value={calibration.metrics.overallDifficulty * 100} className="h-3" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium">{(calibration.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        {calibration.recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <h4 className="text-sm font-medium">Recommendations</h4>
            </div>
            <ul className="space-y-1">
              {calibration.recommendations.map((rec, index) => (
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
