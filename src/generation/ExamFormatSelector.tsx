import { EXAM_FORMATS, ExamFormat, getDefaultFormat } from '@/types/examFormats';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { FileText, ListChecks, CheckCircle2, PenTool } from 'lucide-react';

interface ExamFormatSelectorProps {
  value: string;
  onChange: (formatId: string) => void;
  totalItems?: number;
}

const typeIcons = {
  mcq: <ListChecks className="w-4 h-4" />,
  true_false: <CheckCircle2 className="w-4 h-4" />,
  fill_blank: <PenTool className="w-4 h-4" />,
  essay: <FileText className="w-4 h-4" />
};

const typeColors = {
  mcq: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  true_false: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  fill_blank: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  essay: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
};

export function ExamFormatSelector({ value, onChange, totalItems = 50 }: ExamFormatSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Exam Format</Label>
      <p className="text-sm text-muted-foreground">
        Choose a section layout for your exam. The AI will generate questions for each section type.
      </p>
      
      <RadioGroup value={value} onValueChange={onChange} className="grid gap-3">
        {EXAM_FORMATS.map((format) => (
          <label
            key={format.id}
            className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
              value === format.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'
            }`}
          >
            <RadioGroupItem value={format.id} className="mt-1" />
            <div className="flex-1 space-y-2">
              <div className="font-medium">{format.name}</div>
              <div className="flex flex-wrap gap-2">
                {format.sections.map((section) => {
                  const count = section.endNumber - section.startNumber + 1;
                  return (
                    <Badge 
                      key={section.id} 
                      variant="secondary"
                      className={`${typeColors[section.questionType]} flex items-center gap-1`}
                    >
                      {typeIcons[section.questionType]}
                      <span>{section.label}: {section.title}</span>
                      <span className="opacity-70">({count})</span>
                    </Badge>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground">{format.description}</p>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

export function SelectedFormatSummary({ formatId }: { formatId: string }) {
  const format = EXAM_FORMATS.find(f => f.id === formatId) || getDefaultFormat();
  
  // Calculate total points correctly - essays have essayCount for actual question count
  const calculateSectionPoints = (section: typeof format.sections[0]) => {
    if (section.questionType === 'essay' && section.essayCount) {
      // Essay sections: essayCount essays * pointsPerQuestion
      return section.essayCount * section.pointsPerQuestion;
    }
    // Regular sections: count * points per question
    const count = section.endNumber - section.startNumber + 1;
    return count * section.pointsPerQuestion;
  };
  
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-sm space-y-2">
          <div className="font-medium">{format.name}</div>
          <div className="grid gap-1">
            {format.sections.map(section => {
              const points = calculateSectionPoints(section);
              return (
                <div key={section.id} className="flex justify-between text-muted-foreground">
                  <span>{section.label}: {section.title} (Q{section.startNumber}-{section.endNumber})</span>
                  <span>{points} pts</span>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t flex justify-between font-medium">
            <span>Total</span>
            <span>{format.totalItems} items / {format.totalPoints} pts</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
