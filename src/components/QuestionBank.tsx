import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  text: string;
  type: 'Multiple Choice' | 'Essay' | 'True/False' | 'Fill in the Blank';
  topic: string;
  bloomLevel: string;
  difficulty: 'Easy' | 'Average' | 'Difficult';
  options?: string[];
  correctAnswer?: string;
  createdBy: 'teacher' | 'ai';
}

interface QuestionBankProps {
  onBack: () => void;
}

export const QuestionBank = ({ onBack }: QuestionBankProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedBloomLevel, setSelectedBloomLevel] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Mock data - replace with actual data from Supabase
  const [questions] = useState<Question[]>([
    {
      id: "1",
      text: "What is the primary purpose of requirements engineering?",
      type: "Multiple Choice",
      topic: "Requirements Engineering",
      bloomLevel: "Remembering",
      difficulty: "Easy",
      options: ["To gather user needs", "To design systems", "To test software", "To deploy applications"],
      correctAnswer: "To gather user needs",
      createdBy: "teacher"
    },
    {
      id: "2",
      text: "Explain the difference between functional and non-functional requirements.",
      type: "Essay",
      topic: "Requirements Engineering",
      bloomLevel: "Understanding",
      difficulty: "Average",
      createdBy: "ai"
    }
  ]);

  const topics = ["Requirements Engineering", "Data and Process Modeling", "Object Modeling & Development"];
  const bloomLevels = ["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"];

  const filteredQuestions = questions.filter(question => {
    return (
      (searchTerm === "" || question.text.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedTopic === "" || question.topic === selectedTopic) &&
      (selectedBloomLevel === "" || question.bloomLevel === selectedBloomLevel) &&
      (selectedDifficulty === "" || question.difficulty === selectedDifficulty)
    );
  });

  const handleAddQuestion = () => {
    toast({
      title: "Success",
      description: "Question added successfully!"
    });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Question Bank</h1>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {/* Add Question Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="questionType">Question Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                    <SelectItem value="essay">Essay</SelectItem>
                    <SelectItem value="true-false">True/False</SelectItem>
                    <SelectItem value="fill-blank">Fill in the Blank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="topic">Topic</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic) => (
                      <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bloomLevel">Bloom's Level</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloomLevels.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Average">Average</SelectItem>
                    <SelectItem value="Difficult">Difficult</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="questionText">Question Text</Label>
              <Textarea 
                placeholder="Enter your question here..."
                className="min-h-[100px]"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddQuestion}>Save Question</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger>
                <SelectValue placeholder="All Topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Topics</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedBloomLevel} onValueChange={setSelectedBloomLevel}>
              <SelectTrigger>
                <SelectValue placeholder="All Bloom Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Bloom Levels</SelectItem>
                {bloomLevels.map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Difficulties</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Average">Average</SelectItem>
                <SelectItem value="Difficult">Difficult</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setSelectedTopic("");
              setSelectedBloomLevel("");
              setSelectedDifficulty("");
            }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((question) => (
          <Card key={question.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">#{question.id}</p>
                  <p className="font-medium mb-3">{question.text}</p>
                  
                  {question.options && (
                    <div className="space-y-1 mb-3">
                      {question.options.map((option, index) => (
                        <p key={index} className="text-sm text-muted-foreground pl-4">
                          {String.fromCharCode(65 + index)}. {option}
                        </p>
                      ))}
                      <p className="text-sm font-medium text-green-600 pl-4">
                        ✓ {question.correctAnswer}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{question.type}</Badge>
                    <Badge variant="outline">{question.topic}</Badge>
                    <Badge variant="outline">{question.bloomLevel}</Badge>
                    <Badge variant={question.difficulty === 'Easy' ? 'default' : question.difficulty === 'Average' ? 'secondary' : 'destructive'}>
                      {question.difficulty}
                    </Badge>
                    <Badge variant={question.createdBy === 'ai' ? 'default' : 'secondary'}>
                      {question.createdBy === 'ai' ? '🤖 AI Generated' : '👤 Teacher Created'}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredQuestions.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No questions found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};