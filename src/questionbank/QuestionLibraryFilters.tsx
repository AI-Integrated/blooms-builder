import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Questions, type QuestionFilters } from "@/services/db/questions";

interface QuestionLibraryFiltersProps {
  filters: QuestionFilters;
  onFiltersChange: (filters: QuestionFilters) => void;
}

export function QuestionLibraryFilters({ filters, onFiltersChange }: QuestionLibraryFiltersProps) {
  const [availableOptions, setAvailableOptions] = useState<{
    subjects: string[];
    gradeLevels: string[];
    terms: string[];
    topics: string[];
  }>({
    subjects: [],
    gradeLevels: [],
    terms: [],
    topics: [],
  });

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const options = await Questions.getUniqueValues();
      setAvailableOptions(options);
    } catch (error) {
      console.error("Error loading filter options:", error);
    }
  };

  const updateFilter = (key: keyof QuestionFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-6 pt-6">
      <div className="space-y-2">
        <Label>Subject</Label>
        <Select value={filters.subject || ""} onValueChange={(v) => updateFilter("subject", v)}>
          <SelectTrigger>
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All subjects</SelectItem>
            {availableOptions.subjects.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Grade Level</Label>
        <Select value={filters.grade_level || ""} onValueChange={(v) => updateFilter("grade_level", v)}>
          <SelectTrigger>
            <SelectValue placeholder="All grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All grades</SelectItem>
            {availableOptions.gradeLevels.map((grade) => (
              <SelectItem key={grade} value={grade}>
                {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Term</Label>
        <Select value={filters.term || ""} onValueChange={(v) => updateFilter("term", v)}>
          <SelectTrigger>
            <SelectValue placeholder="All terms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All terms</SelectItem>
            {availableOptions.terms.map((term) => (
              <SelectItem key={term} value={term}>
                {term}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Topic</Label>
        <Select value={filters.topic || ""} onValueChange={(v) => updateFilter("topic", v)}>
          <SelectTrigger>
            <SelectValue placeholder="All topics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All topics</SelectItem>
            {availableOptions.topics.map((topic) => (
              <SelectItem key={topic} value={topic}>
                {topic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Difficulty</Label>
        <Select value={filters.difficulty || ""} onValueChange={(v) => updateFilter("difficulty", v)}>
          <SelectTrigger>
            <SelectValue placeholder="All difficulties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All difficulties</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Bloom's Level</Label>
        <Select value={filters.bloom_level || ""} onValueChange={(v) => updateFilter("bloom_level", v)}>
          <SelectTrigger>
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All levels</SelectItem>
            <SelectItem value="remembering">Remembering</SelectItem>
            <SelectItem value="understanding">Understanding</SelectItem>
            <SelectItem value="applying">Applying</SelectItem>
            <SelectItem value="analyzing">Analyzing</SelectItem>
            <SelectItem value="evaluating">Evaluating</SelectItem>
            <SelectItem value="creating">Creating</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Approval Status</Label>
        <Select
          value={filters.approved === undefined ? "" : filters.approved ? "approved" : "pending"}
          onValueChange={(v) =>
            updateFilter("approved", v === "" ? undefined : v === "approved" ? "true" : "false")
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          <Badge variant="secondary">{activeFilterCount}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={clearFilters} disabled={activeFilterCount === 0}>
          <X className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>
    </div>
  );
}
