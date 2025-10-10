import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, FileText, ChevronRight, Search, Filter } from "lucide-react";
import { Questions, type Question, type QuestionFilters } from "@/services/db/questions";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { QuestionLibraryFilters } from "./QuestionLibraryFilters";
import { useToast } from "@/hooks/use-toast";

interface GroupedQuestions {
  [subject: string]: {
    [gradeLevel: string]: {
      [term: string]: {
        [topic: string]: Question[];
      };
    };
  };
}

export function QuestionLibrary() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [groupedQuestions, setGroupedQuestions] = useState<GroupedQuestions>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<QuestionFilters>({});
  const [expandedPath, setExpandedPath] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadQuestions();
  }, [filters]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await Questions.search({ ...filters, search: searchTerm });
      setQuestions(data);
      groupQuestionsByHierarchy(data);
    } catch (error) {
      console.error("Error loading questions:", error);
      toast({
        title: "Error",
        description: "Failed to load question library",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupQuestionsByHierarchy = (data: Question[]) => {
    const grouped: GroupedQuestions = {};
    
    data.forEach((question) => {
      const subject = question.subject || "Uncategorized";
      const grade = question.grade_level || "No Grade";
      const term = question.term || "No Term";
      const topic = question.topic || "No Topic";

      if (!grouped[subject]) grouped[subject] = {};
      if (!grouped[subject][grade]) grouped[subject][grade] = {};
      if (!grouped[subject][grade][term]) grouped[subject][grade][term] = {};
      if (!grouped[subject][grade][term][topic]) grouped[subject][grade][term][topic] = [];
      
      grouped[subject][grade][term][topic].push(question);
    });

    setGroupedQuestions(grouped);
  };

  const handleSearch = () => {
    loadQuestions();
  };

  const toggleExpand = (path: string) => {
    setExpandedPath((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const isExpanded = (path: string) => expandedPath.includes(path);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Question Library</CardTitle>
              <CardDescription>
                Browse questions organized by subject, grade level, and term
              </CardDescription>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Questions</SheetTitle>
                  <SheetDescription>
                    Refine your search with advanced filters
                  </SheetDescription>
                </SheetHeader>
                <QuestionLibraryFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading library...</div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {Object.keys(groupedQuestions).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No questions found. Try adjusting your filters.
                  </div>
                ) : (
                  Object.entries(groupedQuestions).map(([subject, grades]) => (
                    <div key={subject} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleExpand(subject)}
                        className="w-full flex items-center gap-2 p-4 hover:bg-accent transition-colors text-left"
                      >
                        <Folder className="h-5 w-5 text-primary" />
                        <span className="font-semibold flex-1">{subject}</span>
                        <Badge variant="secondary">
                          {Object.values(grades).flatMap((terms) =>
                            Object.values(terms).flatMap((topics) =>
                              Object.values(topics).flat()
                            )
                          ).length}{" "}
                          questions
                        </Badge>
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            isExpanded(subject) ? "rotate-90" : ""
                          }`}
                        />
                      </button>

                      {isExpanded(subject) && (
                        <div className="pl-8 pb-2">
                          {Object.entries(grades).map(([grade, terms]) => (
                            <div key={`${subject}-${grade}`} className="my-2">
                              <button
                                onClick={() => toggleExpand(`${subject}-${grade}`)}
                                className="w-full flex items-center gap-2 p-3 hover:bg-accent rounded transition-colors text-left"
                              >
                                <Folder className="h-4 w-4 text-blue-500" />
                                <span className="font-medium flex-1">{grade}</span>
                                <Badge variant="outline" className="text-xs">
                                  {Object.values(terms).flatMap((topics) =>
                                    Object.values(topics).flat()
                                  ).length}
                                </Badge>
                                <ChevronRight
                                  className={`h-4 w-4 transition-transform ${
                                    isExpanded(`${subject}-${grade}`) ? "rotate-90" : ""
                                  }`}
                                />
                              </button>

                              {isExpanded(`${subject}-${grade}`) && (
                                <div className="pl-8">
                                  {Object.entries(terms).map(([term, topics]) => (
                                    <div key={`${subject}-${grade}-${term}`} className="my-2">
                                      <button
                                        onClick={() =>
                                          toggleExpand(`${subject}-${grade}-${term}`)
                                        }
                                        className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded transition-colors text-left"
                                      >
                                        <Folder className="h-4 w-4 text-green-500" />
                                        <span className="text-sm flex-1">{term}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {Object.values(topics).flat().length}
                                        </Badge>
                                        <ChevronRight
                                          className={`h-3 w-3 transition-transform ${
                                            isExpanded(`${subject}-${grade}-${term}`)
                                              ? "rotate-90"
                                              : ""
                                          }`}
                                        />
                                      </button>

                                      {isExpanded(`${subject}-${grade}-${term}`) && (
                                        <div className="pl-8 space-y-1">
                                          {Object.entries(topics).map(([topic, qs]) => (
                                            <div
                                              key={`${subject}-${grade}-${term}-${topic}`}
                                              className="flex items-center gap-2 p-2 hover:bg-accent rounded text-sm"
                                            >
                                              <FileText className="h-4 w-4 text-orange-500" />
                                              <span className="flex-1">{topic}</span>
                                              <Badge variant="secondary" className="text-xs">
                                                {qs.length}
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
