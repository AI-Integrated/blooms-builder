import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Bot, User, Filter, Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function QuestionBankView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [bloomFilter, setBloomFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['teacher-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const topics = [...new Set(questions.map(q => q.topic).filter(Boolean))];

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (question.topic || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = topicFilter === "all" || question.topic === topicFilter;
    const matchesBloom = bloomFilter === "all" || question.bloom_level === bloomFilter;
    const matchesDifficulty = difficultyFilter === "all" || question.difficulty === difficultyFilter;
    return matchesSearch && matchesTopic && matchesBloom && matchesDifficulty;
  });

  const getTypeDisplay = (type: string) => {
    const types: Record<string, string> = { mcq: "Multiple Choice", essay: "Essay", tf: "True/False", fill: "Fill in the Blank" };
    return types[type] || type;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800";
      case "Average": return "bg-yellow-100 text-yellow-800";
      case "Difficult": return "bg-red-100 text-red-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getBloomColor = (level: string) => {
    const colors: Record<string, string> = {
      "Remembering": "bg-blue-100 text-blue-800",
      "Understanding": "bg-green-100 text-green-800",
      "Applying": "bg-yellow-100 text-yellow-800",
      "Analyzing": "bg-orange-100 text-orange-800",
      "Evaluating": "bg-red-100 text-red-800",
      "Creating": "bg-purple-100 text-purple-800"
    };
    return colors[level] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Database className="h-8 w-8" />
          Question Bank
        </h1>
        <p className="text-muted-foreground">Browse and view available questions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={bloomFilter} onValueChange={setBloomFilter}>
              <SelectTrigger><SelectValue placeholder="Bloom's Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {["Remembering","Understanding","Applying","Analyzing","Evaluating","Creating"].map(l =>
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Average">Average</SelectItem>
                <SelectItem value="Difficult">Difficult</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions ({filteredQuestions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading questions...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Bloom's Level</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="max-w-md">
                      <p className="text-sm font-medium line-clamp-2">{question.question_text}</p>
                      {question.question_type === "mcq" && question.choices && typeof question.choices === 'object' && (
                        <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                          {Object.entries(question.choices as Record<string, unknown>).map(([key, value]) => (
                            <div key={key} className={question.correct_answer === key ? 'font-medium text-green-600' : ''}>
                              {key}. {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{question.topic}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{getTypeDisplay(question.question_type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${getBloomColor(question.bloom_level || '')}`}>{question.bloom_level}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${getDifficultyColor(question.difficulty || '')}`}>{question.difficulty}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {question.created_by === "ai" ? <Bot className="h-4 w-4 text-blue-500" /> : <User className="h-4 w-4 text-green-500" />}
                        <span className="text-xs capitalize">{question.created_by}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredQuestions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No questions found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
