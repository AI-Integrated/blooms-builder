import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Questions, type Question } from "@/services/db/questions";

export default function QuestionBankManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    question_text: "",
    question_type: "mcq" as const,
    choices: [] as any[],
    correct_answer: "",
    topic: "",
    bloom_level: "",
    difficulty: "",
    subject: "",
    grade_level: "",
    cognitive_level: "",
    knowledge_dimension: ""
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ['admin-questions', searchQuery],
    queryFn: async () => {
      const filters = searchQuery ? { search: searchQuery } : {};
      return await Questions.getAll(filters);
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await Questions.create({
        ...data,
        created_by: 'admin',
        approved: true,
        status: 'approved'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      toast.success('Question created successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create question');
      console.error(error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<typeof formData> }) => {
      return await Questions.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      toast.success('Question updated successfully');
      setEditingId(null);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update question');
      console.error(error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await Questions.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      toast.success('Question deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete question');
      console.error(error);
    }
  });

  const resetForm = () => {
    setFormData({
      question_text: "",
      question_type: "mcq",
      choices: [],
      correct_answer: "",
      topic: "",
      bloom_level: "",
      difficulty: "",
      subject: "",
      grade_level: "",
      cognitive_level: "",
      knowledge_dimension: ""
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleEdit = (question: Question) => {
    setEditingId(question.id);
    setFormData({
      question_text: question.question_text,
      question_type: question.question_type as any,
      choices: question.choices as any[],
      correct_answer: question.correct_answer || "",
      topic: question.topic,
      bloom_level: question.bloom_level,
      difficulty: question.difficulty,
      subject: question.subject || "",
      grade_level: question.grade_level || "",
      cognitive_level: question.cognitive_level || "",
      knowledge_dimension: question.knowledge_dimension || ""
    });
  };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Question Bank Manager</h1>
            <p className="text-slate-400">Full CRUD access to master question repository</p>
          </div>
          <Button 
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>

        {/* Search */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Form */}
        {(isCreating || editingId) && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">
                {editingId ? 'Edit Question' : 'Create New Question'}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {editingId ? 'Update question details' : 'Add a new question to the bank'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Question Text</Label>
                <Textarea
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-200">Topic</Label>
                  <Input
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">Bloom's Level</Label>
                  <Select value={formData.bloom_level} onValueChange={(v) => setFormData({ ...formData, bloom_level: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Remembering">Remembering</SelectItem>
                      <SelectItem value="Understanding">Understanding</SelectItem>
                      <SelectItem value="Applying">Applying</SelectItem>
                      <SelectItem value="Analyzing">Analyzing</SelectItem>
                      <SelectItem value="Evaluating">Evaluating</SelectItem>
                      <SelectItem value="Creating">Creating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">Difficulty</Label>
                  <Select value={formData.difficulty} onValueChange={(v) => setFormData({ ...formData, difficulty: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">Subject</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? 'Update' : 'Create'}
                </Button>
                <Button onClick={resetForm} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions List */}
        <div className="space-y-2">
          {isLoading ? (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6 text-center text-slate-400">
                Loading questions...
              </CardContent>
            </Card>
          ) : questions && questions.length > 0 ? (
            questions.map((q) => (
              <Card key={q.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-slate-100 font-medium mb-2">{q.question_text}</p>
                      <div className="flex gap-2 text-xs text-slate-400">
                        <span className="px-2 py-1 bg-slate-800 rounded">{q.topic}</span>
                        <span className="px-2 py-1 bg-slate-800 rounded">{q.bloom_level}</span>
                        <span className="px-2 py-1 bg-slate-800 rounded">{q.difficulty}</span>
                        <span className="px-2 py-1 bg-slate-800 rounded">Used: {q.used_count || 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(q)}
                        className="text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(q.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-slate-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6 text-center text-slate-400">
                No questions found. Create your first question!
              </CardContent>
            </Card>
          )}
        </div>
      </div>
  );
}
