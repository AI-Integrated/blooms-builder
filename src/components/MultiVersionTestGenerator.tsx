import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Plus, 
  Shuffle, 
  FileText, 
  Download,
  Printer,
  Eye,
  RefreshCw,
  Target,
  Filter,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  topic: string;
  bloom_level: string;
  difficulty: string;
  choices?: any;
  correct_answer?: string;
  created_by: string;
}

interface TestVersion {
  version: 'A' | 'B' | 'C';
  questions: Question[];
  title: string;
  instructions: string;
  timeLimit?: number;
  totalPoints: number;
}

interface MultiVersionTestGeneratorProps {
  onBack: () => void;
}

export const MultiVersionTestGenerator = ({ onBack }: MultiVersionTestGeneratorProps) => {
  const { toast } = useToast();
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [testVersions, setTestVersions] = useState<TestVersion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<'A' | 'B' | 'C'>('A');

  // Test configuration
  const [testConfig, setTestConfig] = useState({
    title: "",
    instructions: "Read each question carefully and select the best answer. Mark your responses clearly.",
    timeLimit: 60,
    pointsPerQuestion: 1,
    shuffleQuestions: true,
    shuffleChoices: true,
    numberOfVersions: 3
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setAvailableQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const shuffleQuestionChoices = (question: Question): Question => {
    if (!question.choices || question.question_type !== 'mcq') {
      return question;
    }

    const choices = Object.entries(question.choices);
    const shuffledChoices = shuffleArray(choices);
    
    // Create new choice mapping
    const newChoices: any = {};
    const choiceKeys = ['a', 'b', 'c', 'd', 'e'];
    
    shuffledChoices.forEach(([, value], index) => {
      if (index < choiceKeys.length) {
        newChoices[choiceKeys[index]] = value;
      }
    });

    // Update correct answer to match new position
    const originalCorrectValue = question.correct_answer;
    const newCorrectKey = shuffledChoices.findIndex(([, value]) => value === originalCorrectValue);
    const newCorrectAnswer = newCorrectKey !== -1 ? choiceKeys[newCorrectKey] : question.correct_answer;

    return {
      ...question,
      choices: newChoices,
      correct_answer: newCorrectAnswer
    };
  };

  const generateTestVersions = () => {
    if (selectedQuestions.length === 0) {
      toast({
        title: "No Questions Selected",
        description: "Please select at least one question to generate test versions.",
        variant: "destructive",
      });
      return;
    }

    if (!testConfig.title.trim()) {
      toast({
        title: "Missing Test Title",
        description: "Please enter a title for your test.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    const versions: TestVersion[] = [];
    const versionLetters: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];

    for (let i = 0; i < testConfig.numberOfVersions; i++) {
      let versionQuestions = [...selectedQuestions];

      // Shuffle questions if enabled
      if (testConfig.shuffleQuestions) {
        versionQuestions = shuffleArray(versionQuestions);
      }

      // Shuffle answer choices if enabled
      if (testConfig.shuffleChoices) {
        versionQuestions = versionQuestions.map(shuffleQuestionChoices);
      }

      versions.push({
        version: versionLetters[i],
        questions: versionQuestions,
        title: `${testConfig.title} - Version ${versionLetters[i]}`,
        instructions: testConfig.instructions,
        timeLimit: testConfig.timeLimit,
        totalPoints: selectedQuestions.length * testConfig.pointsPerQuestion
      });
    }

    setTestVersions(versions);
    setIsGenerating(false);

    toast({
      title: "Test Versions Generated",
      description: `Successfully created ${testConfig.numberOfVersions} test versions with shuffled content.`,
    });
  };

  const handleQuestionToggle = (question: Question, isSelected: boolean) => {
    if (isSelected) {
      setSelectedQuestions(prev => [...prev, question]);
    } else {
      setSelectedQuestions(prev => prev.filter(q => q.id !== question.id));
    }
  };

  const handleDownloadPDF = async (version: TestVersion) => {
    try {
      const element = document.getElementById(`test-version-${version.version}`);
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${version.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const handlePrint = (version: TestVersion) => {
    const element = document.getElementById(`test-version-${version.version}`);
    if (element) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${version.title}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .question { margin-bottom: 20px; page-break-inside: avoid; }
                .choices { margin-left: 20px; }
                .choice { margin-bottom: 5px; }
                @media print { .no-print { display: none; } }
              </style>
            </head>
            <body>
              ${element.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const topics = [...new Set(availableQuestions.map(q => q.topic))];
  const difficulties = ['easy', 'average', 'difficult'];

  const filteredQuestions = availableQuestions.filter(question => {
    return (
      (searchTerm === "" || question.question_text.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedTopic === "" || selectedTopic === "all" || question.topic === selectedTopic) &&
      (selectedDifficulty === "" || selectedDifficulty === "all" || question.difficulty.toLowerCase() === selectedDifficulty)
    );
  });

  const formatQuestionType = (type: string) => {
    switch (type) {
      case 'mcq':
        return 'Multiple Choice';
      case 'true_false':
        return 'True/False';
      case 'essay':
        return 'Essay';
      case 'fill_in_blank':
        return 'Fill in the Blank';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom section-padding">
        {/* Header */}
        <div className="text-center mb-16 animate-slide-in-down">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
            <Shuffle className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Multi-Version Tests</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            Multi-Version <span className="text-shimmer">Test Generator</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Create multiple versions of tests with shuffled questions and answer choices to prevent cheating
          </p>
          <Button variant="outline" onClick={onBack} className="interactive focus-ring">
            ← Back to Dashboard
          </Button>
        </div>

        <Tabs defaultValue="configure" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configure">Configure Test</TabsTrigger>
            <TabsTrigger value="select">Select Questions</TabsTrigger>
            <TabsTrigger value="preview">Preview Versions</TabsTrigger>
          </TabsList>

          {/* Configure Test Tab */}
          <TabsContent value="configure" className="space-y-6">
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Test Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="testTitle">Test Title *</Label>
                    <Input
                      id="testTitle"
                      value={testConfig.title}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Midterm Examination"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      value={testConfig.timeLimit}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 60 }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="instructions">Test Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={testConfig.instructions}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, instructions: e.target.value }))}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="pointsPerQuestion">Points per Question</Label>
                    <Input
                      id="pointsPerQuestion"
                      type="number"
                      value={testConfig.pointsPerQuestion}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, pointsPerQuestion: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="numberOfVersions">Number of Versions</Label>
                    <Select 
                      value={testConfig.numberOfVersions.toString()} 
                      onValueChange={(value) => setTestConfig(prev => ({ ...prev, numberOfVersions: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 Versions (A, B)</SelectItem>
                        <SelectItem value="3">3 Versions (A, B, C)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Shuffling Options</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shuffleQuestions"
                        checked={testConfig.shuffleQuestions}
                        onCheckedChange={(checked) => setTestConfig(prev => ({ ...prev, shuffleQuestions: checked as boolean }))}
                      />
                      <Label htmlFor="shuffleQuestions" className="cursor-pointer">
                        Shuffle question order
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shuffleChoices"
                        checked={testConfig.shuffleChoices}
                        onCheckedChange={(checked) => setTestConfig(prev => ({ ...prev, shuffleChoices: checked as boolean }))}
                      />
                      <Label htmlFor="shuffleChoices" className="cursor-pointer">
                        Shuffle answer choices
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Select Questions Tab */}
          <TabsContent value="select" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-primary/20 rounded-xl">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-primary mb-1">
                    {availableQuestions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Available Questions</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20 card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-secondary/20 rounded-xl">
                      <CheckCircle className="w-6 h-6 text-secondary" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-secondary mb-1">
                    {selectedQuestions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Selected Questions</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-accent/20 rounded-xl">
                      <Target className="w-6 h-6 text-accent" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-accent mb-1">
                    {selectedQuestions.length * testConfig.pointsPerQuestion}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20 card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-500/20 rounded-xl">
                      <Shuffle className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-green-500 mb-1">
                    {testConfig.numberOfVersions}
                  </div>
                  <div className="text-sm text-muted-foreground">Test Versions</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-card">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      <SelectItem value="all">All Topics</SelectItem>
                      {topics.map((topic) => (
                        <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      {difficulties.map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedTopic("all");
                      setSelectedDifficulty("all");
                    }}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 focus-ring"
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Questions List */}
            <div className="space-y-4">
              {loading ? (
                <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
                  <CardContent className="p-12 text-center">
                    <RefreshCw className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50 animate-spin" />
                    <p className="text-muted-foreground">Loading questions...</p>
                  </CardContent>
                </Card>
              ) : filteredQuestions.length === 0 ? (
                <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
                  <CardContent className="p-12 text-center">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No questions found</h3>
                    <p className="text-muted-foreground">Try adjusting your search criteria.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredQuestions.map((question) => {
                  const isSelected = selectedQuestions.some(q => q.id === question.id);
                  return (
                    <Card key={question.id} className={`bg-card/80 backdrop-blur-sm border card-hover transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border/50'}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleQuestionToggle(question, checked as boolean)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-medium mb-3">{question.question_text}</p>
                            
                            {question.choices && (
                              <div className="space-y-1 mb-3">
                                {Object.entries(question.choices).map(([key, value]) => (
                                  <p key={key} className="text-sm text-muted-foreground pl-4">
                                    {key.toUpperCase()}. {value as string}
                                  </p>
                                ))}
                                {question.correct_answer && (
                                  <p className="text-sm font-medium text-green-600 pl-4">
                                    ✓ Correct: {question.correct_answer.toUpperCase()}
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">{formatQuestionType(question.question_type)}</Badge>
                              <Badge variant="outline">{question.topic}</Badge>
                              <Badge variant="outline">{question.bloom_level}</Badge>
                              <Badge variant="outline">{question.difficulty}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            <div className="flex justify-center pt-6">
              <Button 
                onClick={generateTestVersions}
                disabled={selectedQuestions.length === 0 || isGenerating}
                className="bg-gradient-primary hover:shadow-glow btn-hover interactive focus-ring"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate Test Versions"}
              </Button>
            </div>
          </TabsContent>

          {/* Preview Versions Tab */}
          <TabsContent value="preview" className="space-y-6">
            {testVersions.length === 0 ? (
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
                <CardContent className="p-12 text-center">
                  <Shuffle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No test versions generated</h3>
                  <p className="text-muted-foreground">Please configure your test and select questions first.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Version Tabs */}
                <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Test Versions</h3>
                      <div className="flex gap-2">
                        {testVersions.map((version) => (
                          <Button
                            key={version.version}
                            onClick={() => setCurrentPreview(version.version)}
                            variant={currentPreview === version.version ? "default" : "outline"}
                            size="sm"
                          >
                            Version {version.version}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const version = testVersions.find(v => v.version === currentPreview);
                          if (version) handlePrint(version);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Print Version {currentPreview}
                      </Button>
                      <Button
                        onClick={() => {
                          const version = testVersions.find(v => v.version === currentPreview);
                          if (version) handleDownloadPDF(version);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Test Preview */}
                {testVersions.map((version) => (
                  <div
                    key={version.version}
                    id={`test-version-${version.version}`}
                    className={`${currentPreview === version.version ? 'block' : 'hidden'} bg-white text-black p-8 print:p-0 rounded-lg border`}
                  >
                    {/* Test Header */}
                    <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
                      <h1 className="text-3xl font-bold mb-2">{version.title}</h1>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
                        <div>
                          <strong>Name:</strong> _______________________
                        </div>
                        <div>
                          <strong>Date:</strong> _______________________
                        </div>
                        <div>
                          <strong>Score:</strong> _____ / {version.totalPoints}
                        </div>
                      </div>
                      {version.timeLimit && (
                        <div className="mt-4 text-center">
                          <strong>Time Limit:</strong> {version.timeLimit} minutes
                        </div>
                      )}
                    </div>

                    {/* Instructions */}
                    <div className="mb-8 p-4 bg-gray-100 rounded border">
                      <h2 className="font-semibold mb-2">Instructions:</h2>
                      <p className="text-sm">{version.instructions}</p>
                    </div>

                    {/* Questions */}
                    <div className="space-y-6">
                      {version.questions.map((question, index) => (
                        <div key={`${version.version}-${question.id}`} className="border-b border-gray-200 pb-4">
                          <div className="flex items-start gap-2 mb-3">
                            <span className="font-semibold text-lg">{index + 1}.</span>
                            <div className="flex-1">
                              <p className="font-medium mb-2">{question.question_text}</p>
                              <div className="text-sm text-gray-600 mb-2">
                                ({testConfig.pointsPerQuestion} point{testConfig.pointsPerQuestion !== 1 ? 's' : ''})
                              </div>
                              
                              {question.choices && question.question_type === 'mcq' && (
                                <div className="space-y-2 ml-4">
                                  {Object.entries(question.choices).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2">
                                      <span className="w-6 h-6 border border-gray-400 rounded bg-white"></span>
                                      <span className="font-medium">{key.toUpperCase()}.</span>
                                      <span>{value as string}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {question.question_type === 'true_false' && (
                                <div className="space-y-2 ml-4">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 border border-gray-400 rounded bg-white"></span>
                                    <span>True</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 border border-gray-400 rounded bg-white"></span>
                                    <span>False</span>
                                  </div>
                                </div>
                              )}

                              {question.question_type === 'essay' && (
                                <div className="ml-4 mt-4">
                                  <div className="border border-gray-300 p-4 bg-gray-50 min-h-[100px]">
                                    <div className="text-gray-400 text-sm">Write your answer here:</div>
                                  </div>
                                </div>
                              )}

                              {question.question_type === 'fill_in_blank' && (
                                <div className="ml-4 mt-2">
                                  <div className="border-b-2 border-gray-400 inline-block min-w-[200px] h-8"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="text-center text-sm text-gray-500 border-t border-gray-300 pt-4 mt-8">
                      <div>End of Test - Please review your answers</div>
                      <div className="mt-2">Generated on {new Date().toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};