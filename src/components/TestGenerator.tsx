import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Download, Upload, Eye, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { RubricAnswerKey } from "./RubricAnswerKey";
import { Questions, Tests } from "@/services/db";
import { Rubrics } from "@/services/db/rubrics";
import { buildNeedsFromTOS, fetchQuestionsForNeeds, generateTestFromTOS } from "@/lib/testGenerator";
import { exportTestVersion, exportAnswerKey } from "@/lib/pdfExport";
import { usePDFExport } from "@/hooks/usePDFExport";
import { supabase } from "@/integrations/supabase/client";

interface TestGeneratorProps {
  onBack: () => void;
}

interface GeneratedQuestion {
  id: number;
  text: string;
  type: 'Multiple Choice' | 'Essay' | 'True/False' | 'Fill in the Blank';
  options?: string[];
  correctAnswer?: string;
  topic: string;
  bloomLevel: string;
  difficulty: 'Easy' | 'Average' | 'Difficult';
}

export const TestGenerator = ({ onBack }: TestGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTest, setGeneratedTest] = useState<GeneratedQuestion[] | null>(null);
  const [generatedVersions, setGeneratedVersions] = useState<any[]>([]);
  const [rubrics, setRubrics] = useState<Record<string, any>>({});
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generationWarnings, setGenerationWarnings] = useState<string[]>([]);
  const [numVersions, setNumVersions] = useState(1);

  const { exportTestQuestions } = usePDFExport();

  // Mock TOS data - this would come from the actual TOS Builder
  const mockTOS = {
    formData: {
    subject: "IS 9 - System Analysis and Design",
    course: "BSIS",
    yearSection: "3A",
    examPeriod: "Final Examination",
    schoolYear: "2024-2025",
      totalItems: 50,
      topics: [
        { topic: "Requirements Engineering", hours: 18 },
        { topic: "Data and Process Modeling", hours: 15 },
        { topic: "Object Modeling & Development", hours: 12 }
      ]
    },
    distribution: {
      "Requirements Engineering": {
        remembering: [1, 2, 3],
        understanding: [4, 5, 6],
        applying: [15, 16],
        analyzing: [25, 26],
        evaluating: [43],
        creating: [44]
      },
      "Data and Process Modeling": {
        remembering: [7, 8],
        understanding: [9, 10],
        applying: [17, 18],
        analyzing: [27, 28],
        evaluating: [45],
        creating: [46]
      },
      "Object Modeling & Development": {
        remembering: [11, 12],
        understanding: [13, 14],
        applying: [19, 20],
        analyzing: [29, 30],
        evaluating: [47],
        creating: [48]
      }
    }
  };

  // Mock generated test
  const mockGeneratedTest: GeneratedQuestion[] = [
    // Easy Questions (Part I)
    {
      id: 1,
      text: "Define the term 'requirement' in software engineering.",
      type: "Essay",
      topic: "Requirements Engineering",
      bloomLevel: "Remembering",
      difficulty: "Easy"
    },
    {
      id: 2,
      text: "Which of the following is NOT a characteristic of a good system requirement?",
      type: "Multiple Choice",
      options: ["Clear and unambiguous", "Testable", "Vague and general", "Feasible"],
      correctAnswer: "Vague and general",
      topic: "Requirements Engineering",
      bloomLevel: "Remembering",
      difficulty: "Easy"
    },
    // Average Questions (Part II)
    {
      id: 15,
      text: "Apply the concept of data flow to design a basic payroll system architecture.",
      type: "Essay",
      topic: "Data and Process Modeling",
      bloomLevel: "Applying",
      difficulty: "Average"
    },
    // Difficult Questions (Part III)
    {
      id: 43,
      text: "Evaluate the completeness of the following user story and propose improvements.",
      type: "Essay",
      topic: "Requirements Engineering",
      bloomLevel: "Evaluating",
      difficulty: "Difficult"
    }
  ];

  useEffect(() => {
    if (generatedTest) {
      loadRubrics();
    }
  }, [generatedTest]);

  const loadRubrics = async () => {
    try {
      const essayQuestions = generatedTest?.filter(q => q.type === 'Essay') || [];
      if (essayQuestions.length === 0) return;

      const rubricsMap: Record<string, any> = {};
      
      for (const question of essayQuestions) {
        try {
          // For now, skip rubric loading for questions since we need to implement question-rubric associations
          // const rubric = await Rubrics.getById(question.rubric_id);
          // if (rubric) {
          //   rubricsMap[question.id.toString()] = rubric;
          // }
        } catch (error) {
          console.error(`Error loading rubric for question ${question.id}:`, error);
        }
      }
      
      setRubrics(rubricsMap);
    } catch (error) {
      console.error('Error loading rubrics:', error);
    }
  };

  const handleGenerateTest = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus("Initializing test generation...");
    setGenerationWarnings([]);
    
    try {
      setGenerationProgress(20);
      setGenerationStatus("Analyzing TOS matrix...");
      
      const testConfig = {
        title: `${mockTOS.formData.subject} Test`,
        subject: mockTOS.formData.subject,
        course: mockTOS.formData.course,
        year_section: mockTOS.formData.yearSection,
        exam_period: mockTOS.formData.examPeriod,
        school_year: mockTOS.formData.schoolYear,
        instructions: "Read each question carefully and select the best answer.",
        time_limit: 60,
        points_per_question: 1,
        shuffle_questions: true,
        shuffle_choices: true,
        number_of_versions: numVersions
      };
      
      setGenerationProgress(40);
      setGenerationStatus("Fetching questions from bank...");
      
      const result = await generateTestFromTOS(mockTOS, testConfig);
      
      setGenerationProgress(80);
      setGenerationStatus("Formatting test questions...");
      
      // Transform to component format
      const transformedQuestions = result.versions[0]?.questions.map((q: any, index: number) => ({
        id: index + 1,
        text: q.question_text,
        type: (q.question_type === 'mcq' || q.question_type === 'multiple_choice' ? 'Multiple Choice' : 
              q.question_type === 'essay' ? 'Essay' : 'True/False') as 'Multiple Choice' | 'Essay' | 'True/False' | 'Fill in the Blank',
        options: q.choices ? Object.values(q.choices).map(String) : undefined,
        correctAnswer: q.correct_answer,
        topic: q.topic,
        bloomLevel: q.bloom_level,
        difficulty: q.difficulty
      })) || [];
      
      setGenerationProgress(100);
      setGenerationStatus("Test generation complete!");
      
      setGeneratedTest(transformedQuestions);
      setGeneratedVersions(result.versions);
      setGenerationWarnings(result.warnings);
      
      toast.success(`Test generated successfully with ${result.versions.length} version(s)!`);
      
      if (result.generatedQuestions > 0) {
        toast.info(`Generated ${result.generatedQuestions} new AI questions to fill gaps`);
      }
    } catch (error) {
      console.error('Error generating test:', error);
      toast.error("Failed to generate test");
      setGenerationStatus("Generation failed");
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        setGenerationProgress(0);
        setGenerationStatus("");
      }, 2000);
    }
  };

  const handleExportTest = () => {
    if (generatedTest && generatedTest.length > 0) {
      exportTestVersion('current-test', 'A', false)
        .then(({ blob }) => {
          const filename = `${mockTOS.formData.subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_test.pdf`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success("Test exported as PDF!");
        })
        .catch(error => {
          console.error('Export error:', error);
          toast.error("Failed to export test");
        });
    }
  };

  const handleExportAnswerKey = () => {
    if (generatedTest && generatedTest.length > 0) {
      exportAnswerKey('current-test', 'A', false)
        .then(({ blob }) => {
          const filename = `${mockTOS.formData.subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_answer_key.pdf`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success("Answer key exported as PDF!");
        })
        .catch(error => {
          console.error('Export error:', error);
          toast.error("Failed to export answer key");
        });
    }
  };

  const handleExportVersion = async (versionLabel: string, isAnswerKey: boolean, uploadToCloud: boolean = false) => {
    // Find the test version
    const version = generatedVersions?.find(v => v.version_label === versionLabel);
    if (!version) {
      toast.error('Test version not found');
      return;
    }

    try {
      const testTitle = `${mockTOS.formData.subject} - Version ${versionLabel}${isAnswerKey ? ' Answer Key' : ''}`;
      
      if (isAnswerKey) {
        // Use lib function for answer key
        const result = await exportAnswerKey('current-test', versionLabel, uploadToCloud);
        if (uploadToCloud && result.storageUrl) {
          toast.success(`Answer Key Version ${versionLabel} uploaded to cloud storage!`);
        } else {
          const filename = `${mockTOS.formData.subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_version_${versionLabel}_answer_key.pdf`;
          const url = URL.createObjectURL(result.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success(`Answer key exported as PDF!`);
        }
      } else {
        // Use hook for test questions
        const result = await exportTestQuestions(
          version.questions,
          testTitle,
          uploadToCloud,
          versionLabel
        );
        
        if (result && typeof result === 'object' && result.success) {
          if (uploadToCloud && 'storageUrl' in result && result.storageUrl) {
            toast.success(`Version ${versionLabel} uploaded to cloud storage!`);
            
            // Track export in database
            try {
              await supabase
                .from('test_exports')
                .insert({
                  test_version_id: version.id,
                  export_type: 'pdf',
                  file_name: result.filename,
                  exported_by: 'teacher'
                });
            } catch (error) {
              console.warn('Failed to track export in database:', error);
            }
          } else {
            toast.success(`Version ${versionLabel} exported successfully!`);
          }
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export version ${versionLabel}`);
    }
  };

  const easyQuestions = generatedTest?.filter(q => q.difficulty === 'Easy') || [];
  const averageQuestions = generatedTest?.filter(q => q.difficulty === 'Average') || [];
  const difficultQuestions = generatedTest?.filter(q => q.difficulty === 'Difficult') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Test Generator</h1>
          </div>
        </div>
      </div>

      {/* TOS Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current TOS Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Subject</p>
              <p className="font-medium">{mockTOS.formData.subject}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Course & Section</p>
              <p className="font-medium">{mockTOS.formData.course} - {mockTOS.formData.yearSection}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Exam Period</p>
              <p className="font-medium">{mockTOS.formData.examPeriod}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">School Year</p>
              <p className="font-medium">{mockTOS.formData.schoolYear}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="font-medium">{mockTOS.formData.totalItems}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Topics</p>
              <p className="font-medium">{mockTOS.formData.topics.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generation Controls */}
      {!generatedTest && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Generate Test Questions</h3>
                <p className="text-muted-foreground">
                  Click below to automatically generate {mockTOS.formData.totalItems} test questions based on your TOS matrix.
                  The system will use approved questions from the bank and generate AI questions for any gaps.
                </p>
              </div>

              {/* Version Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Versions</label>
                <select 
                  value={numVersions} 
                  onChange={(e) => setNumVersions(parseInt(e.target.value))}
                  className="border rounded-md px-3 py-2 w-32"
                  disabled={isGenerating}
                >
                  <option value={1}>1 Version</option>
                  <option value={2}>2 Versions (A, B)</option>
                  <option value={3}>3 Versions (A, B, C)</option>
                  <option value={4}>4 Versions (A, B, C, D)</option>
                  <option value={5}>5 Versions (A, B, C, D, E)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Each version will have shuffled questions and answer choices
                </p>
              </div>
              
              {isGenerating && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{generationStatus}</span>
                      <span>{Math.round(generationProgress)}%</span>
                    </div>
                    <Progress value={generationProgress} />
                  </div>
                </div>
              )}
              
              <Button 
                size="lg" 
                onClick={handleGenerateTest}
                disabled={isGenerating}
                className="px-8"
              >
                {isGenerating ? "Generating..." : `🧠 Generate ${numVersions > 1 ? `${numVersions} Test Versions` : 'Test Questions'}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Test Preview */}
      {generatedTest && (
        <div className="space-y-6">
          {/* Generation Warnings */}
          {generationWarnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Generation Notes:</p>
                  <ul className="list-disc list-inside text-sm">
                    {generationWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Version Export Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Test Versions ({generatedVersions.length} Generated)</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedVersions.length > 1 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Each version has shuffled questions and answer choices. Select a version to download:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {generatedVersions.map((version, index) => (
                      <Card key={version.version_label} className="border-2">
                        <CardContent className="pt-4">
                          <div className="text-center space-y-2">
                            <h4 className="font-semibold">Version {version.version_label}</h4>
                            <p className="text-xs text-muted-foreground">
                              {version.questions.length} questions • {version.total_points} points
                            </p>
                             <div className="flex flex-col gap-2">
                               <div className="flex gap-1">
                                 <Button 
                                   variant="outline" 
                                   size="sm"
                                   onClick={() => handleExportVersion(version.version_label, false, false)}
                                   className="flex-1"
                                 >
                                   <Download className="h-3 w-3 mr-1" />
                                   Download
                                 </Button>
                                 <Button 
                                   size="sm"
                                   onClick={() => handleExportVersion(version.version_label, false, true)}
                                   className="flex-1"
                                 >
                                   <Upload className="h-3 w-3 mr-1" />
                                   To Cloud
                                 </Button>
                               </div>
                               <Button 
                                 variant="outline" 
                                 size="sm"
                                 onClick={() => handleExportVersion(version.version_label, true, false)}
                                 className="text-xs"
                               >
                                 <Download className="h-3 w-3 mr-1" />
                                 Answer Key
                               </Button>
                             </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button variant="outline" onClick={handleExportTest}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Test (PDF)
                  </Button>
                  <Button variant="outline" onClick={handleExportAnswerKey}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Answer Key (PDF)
                  </Button>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Test
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Content */}
          <Card>
            <CardHeader>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">AGUSAN DEL SUR STATE COLLEGE OF AGRICULTURE AND TECHNOLOGY</h2>
                <p className="text-lg">College of Computing and Information Sciences</p>
                <Separator className="my-4" />
                <div className="space-y-1">
                  <p><strong>Subject:</strong> {mockTOS.formData.subject}</p>
                  <p><strong>Examination:</strong> {mockTOS.formData.examPeriod} | <strong>Year:</strong> {mockTOS.formData.schoolYear} | <strong>Course:</strong> {mockTOS.formData.course} – {mockTOS.formData.yearSection}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Part I - Easy Questions */}
              {easyQuestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-green-600">Part I – Easy Questions</h3>
                  <div className="space-y-4">
                    {easyQuestions.slice(0, 5).map((question) => (
                      <div key={question.id} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="font-medium">{question.id}.</span>
                          <div className="flex-1">
                            <p>{question.text}</p>
                            {question.options && (
                              <div className="mt-2 space-y-1 ml-4">
                                {question.options.map((option, index) => (
                                  <p key={index} className="text-sm">
                                    {String.fromCharCode(65 + index)}. {option}
                                  </p>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{question.topic}</Badge>
                              <Badge variant="outline" className="text-xs">{question.bloomLevel}</Badge>
                            </div>
                            
                            {/* Show rubric for essay questions */}
                            {question.type === 'Essay' && rubrics[question.id.toString()] && (
                              <RubricAnswerKey
                                question={{
                                  id: question.id.toString(),
                                  question_text: question.text,
                                  question_type: 'essay',
                                  topic: question.topic,
                                  bloom_level: question.bloomLevel,
                                  difficulty: question.difficulty
                                }}
                                rubric={rubrics[question.id.toString()]}
                                questionNumber={question.id}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {easyQuestions.length > 5 && (
                      <p className="text-sm text-muted-foreground italic">
                        ... and {easyQuestions.length - 5} more easy questions
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Part II - Average Questions */}
              {averageQuestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-blue-600">Part II – Average Questions</h3>
                  <div className="space-y-4">
                    {averageQuestions.slice(0, 3).map((question) => (
                      <div key={question.id} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="font-medium">{question.id}.</span>
                          <div className="flex-1">
                            <p>{question.text}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{question.topic}</Badge>
                              <Badge variant="outline" className="text-xs">{question.bloomLevel}</Badge>
                            </div>
                            
                            {/* Show rubric for essay questions */}
                            {question.type === 'Essay' && rubrics[question.id.toString()] && (
                              <RubricAnswerKey
                                question={{
                                  id: question.id.toString(),
                                  question_text: question.text,
                                  question_type: 'essay',
                                  topic: question.topic,
                                  bloom_level: question.bloomLevel,
                                  difficulty: question.difficulty
                                }}
                                rubric={rubrics[question.id.toString()]}
                                questionNumber={question.id}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {averageQuestions.length > 3 && (
                      <p className="text-sm text-muted-foreground italic">
                        ... and {averageQuestions.length - 3} more average questions
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Part III - Difficult Questions */}
              {difficultQuestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-red-600">Part III – Difficult Questions</h3>
                  <div className="space-y-4">
                    {difficultQuestions.slice(0, 2).map((question) => (
                      <div key={question.id} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="font-medium">{question.id}.</span>
                          <div className="flex-1">
                            <p>{question.text}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{question.topic}</Badge>
                              <Badge variant="outline" className="text-xs">{question.bloomLevel}</Badge>
                            </div>
                            
                            {/* Show rubric for essay questions */}
                            {question.type === 'Essay' && rubrics[question.id.toString()] && (
                              <RubricAnswerKey
                                question={{
                                  id: question.id.toString(),
                                  question_text: question.text,
                                  question_type: 'essay',
                                  topic: question.topic,
                                  bloom_level: question.bloomLevel,
                                  difficulty: question.difficulty
                                }}
                                rubric={rubrics[question.id.toString()]}
                                questionNumber={question.id}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {difficultQuestions.length > 2 && (
                      <p className="text-sm text-muted-foreground italic">
                        ... and {difficultQuestions.length - 2} more difficult questions
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Test Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{easyQuestions.length}</p>
                  <p className="text-sm text-muted-foreground">Easy Questions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{averageQuestions.length}</p>
                  <p className="text-sm text-muted-foreground">Average Questions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{difficultQuestions.length}</p>
                  <p className="text-sm text-muted-foreground">Difficult Questions</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-primary">{generatedTest.length}</p>
                  <p className="text-sm text-muted-foreground">Total Questions</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-secondary">
                    {mockTOS.formData.topics.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Topics Covered</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-accent">
                    {generatedTest.length * 1}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};