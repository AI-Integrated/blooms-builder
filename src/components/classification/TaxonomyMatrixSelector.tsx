import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaxonomyMatrixSelectorProps {
  selectedBloom?: string;
  selectedKnowledge?: string;
  onSelect: (bloomLevel: string, knowledgeDimension: string) => void;
  showLabels?: boolean;
  compact?: boolean;
}

const cognitiveLevels = [
  { key: 'remembering', label: 'Remember', description: 'Recall facts and basic concepts' },
  { key: 'understanding', label: 'Understand', description: 'Explain ideas or concepts' },
  { key: 'applying', label: 'Apply', description: 'Use information in new situations' },
  { key: 'analyzing', label: 'Analyze', description: 'Draw connections among ideas' },
  { key: 'evaluating', label: 'Evaluate', description: 'Justify a decision or course of action' },
  { key: 'creating', label: 'Create', description: 'Produce new or original work' }
];

const knowledgeDimensions = [
  { key: 'factual', label: 'Factual', description: 'Basic elements students must know' },
  { key: 'conceptual', label: 'Conceptual', description: 'Relationships among elements' },
  { key: 'procedural', label: 'Procedural', description: 'How to do something' },
  { key: 'metacognitive', label: 'Metacognitive', description: 'Knowledge of cognition and awareness' }
];

export function TaxonomyMatrixSelector({
  selectedBloom,
  selectedKnowledge,
  onSelect,
  showLabels = true,
  compact = false
}: TaxonomyMatrixSelectorProps) {
  const isSelected = (bloomKey: string, knowledgeKey: string) => {
    return selectedBloom === bloomKey && selectedKnowledge === knowledgeKey;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Two-Way Taxonomy Matrix</CardTitle>
        </div>
        {showLabels && (
          <p className="text-sm text-muted-foreground mt-1">
            Click a cell to classify your question by cognitive process and knowledge type
          </p>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 border border-border bg-muted/50 text-xs font-semibold text-left min-w-[100px]">
                  Cognitive Level
                </th>
                {knowledgeDimensions.map((dimension) => (
                  <th 
                    key={dimension.key} 
                    className="p-2 border border-border bg-muted/50 text-xs font-semibold text-center min-w-[100px]"
                    title={dimension.description}
                  >
                    <div className="space-y-0.5">
                      <div>{dimension.label}</div>
                      {!compact && (
                        <div className="text-[10px] text-muted-foreground font-normal">
                          Knowledge
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cognitiveLevels.map((cognitive) => (
                <tr key={cognitive.key}>
                  <td 
                    className="p-2 border border-border bg-muted/30 font-medium text-xs"
                    title={cognitive.description}
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold">{cognitive.label}</div>
                      {!compact && (
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {cognitive.description}
                        </div>
                      )}
                    </div>
                  </td>
                  {knowledgeDimensions.map((dimension) => {
                    const selected = isSelected(cognitive.key, dimension.key);
                    
                    return (
                      <td
                        key={`${cognitive.key}-${dimension.key}`}
                        onClick={() => onSelect(cognitive.key, dimension.key)}
                        className={cn(
                          'p-3 border border-border cursor-pointer transition-all',
                          'hover:bg-primary/10 hover:shadow-sm hover:scale-105',
                          'active:scale-95',
                          selected && 'bg-primary/20 ring-2 ring-primary shadow-md scale-105'
                        )}
                        title={`${cognitive.label} × ${dimension.label}\n${cognitive.description}`}
                      >
                        <div className="flex items-center justify-center">
                          {selected ? (
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-primary/50" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Classification Badge */}
        {selectedBloom && selectedKnowledge && (
          <div className="p-3 border-t bg-muted/30">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Selected Classification:</span>
              <Badge variant="default" className="capitalize">
                {cognitiveLevels.find(c => c.key === selectedBloom)?.label}
              </Badge>
              <span className="text-muted-foreground">×</span>
              <Badge variant="secondary" className="capitalize">
                {knowledgeDimensions.find(d => d.key === selectedKnowledge)?.label}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
