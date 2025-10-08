import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParallelForm {
  versionLabel: string;
  questionOrder: string[];
  shuffleSeed: string | null;
  metadata: any;
}

interface ParallelFormViewerProps {
  forms: ParallelForm[];
  questions: any[];
}

export function ParallelFormViewer({ forms, questions }: ParallelFormViewerProps) {
  const getQuestionById = (id: string) => {
    return questions.find(q => q.id === id);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {forms.map((form, formIndex) => (
        <Card key={form.versionLabel}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Form {form.versionLabel}</CardTitle>
              <Badge variant="outline">{form.questionOrder.length} items</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Seed: {form.shuffleSeed?.substring(0, 8)}
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {form.questionOrder.map((questionId, index) => {
                  const question = getQuestionById(questionId);
                  const isDifferentFromPrevious = formIndex > 0 && 
                    forms[formIndex - 1].questionOrder[index] !== questionId;
                  
                  return (
                    <div 
                      key={`${questionId}-${index}`}
                      className={`p-2 rounded border ${
                        isDifferentFromPrevious 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-sm min-w-[30px]">
                          {index + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="text-sm line-clamp-2">
                            {question?.question_text || 'Unknown question'}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {question?.bloom_level || 'N/A'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {question?.difficulty || 'N/A'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
