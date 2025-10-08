import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Sparkles, Check } from "lucide-react";
import { useStandards } from "@/hooks/useStandards";
import { toast } from "sonner";

interface OutcomeMapperProps {
  questionId: string;
  questionText: string;
  bloomLevel: string;
  subjectArea: string;
}

export function OutcomeMapper({ 
  questionId, 
  questionText, 
  bloomLevel, 
  subjectArea 
}: OutcomeMapperProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [alignmentStrength, setAlignmentStrength] = useState(1.0);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  const { suggestStandards, mapQuestionToStandard, isLoading } = useStandards();

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const results = await suggestStandards(questionText, bloomLevel, subjectArea);
      setSuggestions(results || []);
      if (!results || results.length === 0) {
        toast.info("No matching standards found. Try adjusting your search criteria.");
      }
    } catch (error) {
      toast.error("Failed to get suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleMapStandard = async (standardId: string) => {
    try {
      await mapQuestionToStandard(questionId, standardId, alignmentStrength);
      toast.success("Question mapped to standard");
    } catch (error) {
      toast.error("Failed to map question");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map to Learning Outcomes</CardTitle>
        <CardDescription>
          Link this question to curriculum standards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Question Preview</Label>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
            {questionText}
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">{bloomLevel}</Badge>
            <Badge variant="outline">{subjectArea}</Badge>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <Label>Alignment Strength</Label>
            <span className="text-sm text-muted-foreground">
              {(alignmentStrength * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[alignmentStrength * 100]}
            min={0}
            max={100}
            step={10}
            onValueChange={([value]) => setAlignmentStrength(value / 100)}
          />
        </div>

        <Button
          onClick={handleGetSuggestions}
          disabled={loadingSuggestions}
          className="w-full"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Get AI Suggestions
        </Button>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <Label>Suggested Standards</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{suggestion.code}</Badge>
                          {suggestion.score && (
                            <Badge variant="secondary">
                              {(suggestion.score * 100).toFixed(0)}% match
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{suggestion.title}</p>
                        {suggestion.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {suggestion.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMapStandard(suggestion.id)}
                        disabled={isLoading}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
