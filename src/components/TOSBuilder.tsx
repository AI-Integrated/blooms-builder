import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Calculator, Brain, Target, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { TOSMatrix } from "./TOSMatrix";
import { TOS } from "@/services/db/tos";
import { Analytics } from "@/services/db/analytics";
import { EdgeFunctions } from "@/services/edgeFunctions";
import { useRealtime } from "@/hooks/useRealtime";
import { usePresence } from "@/hooks/usePresence";
import { buildTestConfigFromTOS } from "@/utils/testVersions";

const topicSchema = z.object({
  topic: z.string().min(1, "Topic name is required"),
  hours: z.number().min(0.5, "Minimum 0.5 hours required")
});

const tosSchema = z.object({
  subject_no: z.string().min(1, "Subject number is required"),
  course: z.string().min(1, "Course is required"),
  description: z.string().min(1, "Subject description is required"),
  year_section: z.string().min(1, "Year & section is required"),
  period: z.string().min(1, "Exam period is required"),
  school_year: z.string().min(1, "School year is required"),
  total_items: z.number().min(10, "Minimum 10 items required").max(100, "Maximum 100 items allowed"),
  topics: z.array(topicSchema).min(1, "At least one topic is required")
});

type TOSFormData = z.infer<typeof tosSchema>;

interface BloomDistribution {
  [topic: string]: {
    remembering: number[];
    understanding: number[];
    applying: number[];
    analyzing: number[];
    evaluating: number[];
    creating: number[];
  };
}

interface TOSBuilderProps {
  onBack: () => void;
}

export const TOSBuilder = ({ onBack }: TOSBuilderProps) => {
  const [topics, setTopics] = useState([{ topic: "", hours: 0 }]);
  const [tosMatrix, setTosMatrix] = useState<any>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [sufficiencyAnalysis, setSufficiencyAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Real-time collaboration setup
  const { users: presenceUsers, isConnected } = usePresence('tos-builder', {
    name: 'Current User', // This should come from auth context
    email: 'user@example.com' // This should come from auth context
  });

  // Real-time updates for TOS changes
  useRealtime('tos-collaboration', {
    table: 'tos',
    onChange: (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        toast.info('TOS updated by collaborator');
        // Optionally refresh data or show notification
      }
    }
  });

  const form = useForm<TOSFormData>({
    resolver: zodResolver(tosSchema),
    defaultValues: {
      total_items: 50,
      topics: topics
    }
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;

  const watchedTotalItems = watch("total_items");

  const addTopic = () => {
    const newTopics = [...topics, { topic: "", hours: 0 }];
    setTopics(newTopics);
    setValue("topics", newTopics);
  };

  const removeTopic = (index: number) => {
    if (topics.length > 1) {
      const newTopics = topics.filter((_, i) => i !== index);
      setTopics(newTopics);
      setValue("topics", newTopics);
    }
  };

  const updateTopic = (index: number, field: "topic" | "hours", value: string | number) => {
    const newTopics = [...topics];
    newTopics[index] = { ...newTopics[index], [field]: value };
    setTopics(newTopics);
    setValue("topics", newTopics);
  };

  const calculateTOSMatrix = (data: TOSFormData) => {
    const totalHours = data.topics.reduce((sum, topic) => sum + topic.hours, 0);
    
    if (totalHours === 0) {
      toast.error("Please add instructional hours for topics");
      return null;
    }

    // Bloom's taxonomy distribution percentages
    const bloomDistribution = {
      remembering: 0.15,   // 15% (Easy)
      understanding: 0.15, // 15% (Easy)
      applying: 0.20,      // 20% (Average)
      analyzing: 0.20,     // 20% (Average)
      evaluating: 0.15,    // 15% (Difficult)
      creating: 0.15       // 15% (Difficult)
    };

    const distribution: BloomDistribution = {};
    let itemCounter = 1;

    data.topics.forEach(topic => {
      const topicPercentage = topic.hours / totalHours;
      const topicItems = Math.round(data.total_items * topicPercentage);
      
      distribution[topic.topic] = {
        remembering: [],
        understanding: [],
        applying: [],
        analyzing: [],
        evaluating: [],
        creating: []
      };

      // Distribute items across Bloom levels for this topic
      Object.keys(bloomDistribution).forEach(bloomLevel => {
        const itemsForLevel = Math.round(topicItems * bloomDistribution[bloomLevel as keyof typeof bloomDistribution]);
        
        for (let i = 0; i < itemsForLevel; i++) {
          distribution[topic.topic][bloomLevel as keyof typeof distribution[string]].push(itemCounter);
          itemCounter++;
        }
      });
    });

    // Adjust for any rounding discrepancies
    while (itemCounter <= data.total_items) {
      // Add remaining items to the first topic's "understanding" level
      const firstTopic = data.topics[0].topic;
      distribution[firstTopic].understanding.push(itemCounter);
      itemCounter++;
    }

    // Build the matrix format expected by the system
    const matrix: Record<string, Record<string, { count: number; items: number[] }>> = {};
    
    Object.entries(distribution).forEach(([topicName, bloomData]) => {
      matrix[topicName] = {};
      Object.entries(bloomData).forEach(([bloomLevel, items]) => {
        matrix[topicName][bloomLevel] = {
          count: items.length,
          items: items
        };
      });
    });
    return {
      id: crypto.randomUUID(), // Temporary ID for new TOS
      subject_no: data.subject_no,
      course: data.course,
      description: data.description,
      year_section: data.year_section,
      period: data.period,
      school_year: data.school_year,
      total_items: data.total_items,
      topics: data.topics,
      bloom_distribution: bloomDistribution,
      matrix,
      totalHours,
      prepared_by: "Teacher",
      noted_by: "Dean, CCIS",
      created_at: new Date().toISOString()
    };
  };

  const onSubmit = (data: TOSFormData) => {
    const matrix = calculateTOSMatrix(data);
    if (matrix) {
      setTosMatrix(matrix);
      setShowMatrix(true);
      // Analyze sufficiency when matrix is generated
      analyzeSufficiency(matrix);
      toast.success("TOS Matrix generated successfully!");
    }
  };

  const analyzeSufficiency = async (matrix: any) => {
    setIsAnalyzing(true);
    try {
      const analysis = await Analytics.getQuestionBankSufficiency(matrix.id);
      setSufficiencyAnalysis(analysis);
      
      // Calculate if sufficient
      const totalShortage = Object.values(analysis).reduce((total: number, topicData: any) => {
        return total + Object.values(topicData as Record<string, any>).reduce((topicTotal: number, bloomData: any) => {
          return topicTotal + (Number(bloomData.shortage) || 0);
        }, 0);
      }, 0);
      
      if (totalShortage > 0) {
        toast.warning(`Question bank has ${totalShortage} missing questions across topics.`);
      } else {
        toast.success("Question bank is sufficient for this TOS!");
      }
    } catch (error) {
      console.error('Error analyzing TOS sufficiency:', error);
      toast.error("Failed to analyze question bank sufficiency");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveMatrix = () => {
    if (tosMatrix) {
      saveTOSMatrix();
    }
  };
  
  const saveTOSMatrix = async () => {
    if (!tosMatrix) return;
    
    try {
      // Remove temporary ID before saving
      const { id, ...tosData } = tosMatrix;
      
      const savedTOS = await TOS.create(tosData);
      setTosMatrix({ ...savedTOS, totalHours: tosMatrix.totalHours });
      
      toast.success("TOS matrix saved successfully!");
    } catch (error) {
      console.error('Error saving TOS:', error);
      toast.error("Failed to save TOS matrix");
    }
  };

  const handleGenerateTest = async () => {
    if (!tosMatrix) return;
    
    setIsGeneratingTest(true);
    setGenerationProgress(0);
    setGenerationStatus("Initializing test generation...");
    
    try {
      setGenerationProgress(20);
      setGenerationStatus("Building test configuration from TOS...");
      
      const testConfig = buildTestConfigFromTOS(tosMatrix);
      
      setGenerationProgress(40);
      setGenerationStatus("Generating questions from TOS matrix...");
      
      const result = await EdgeFunctions.generateQuestionsFromTOS(
        testConfig,
        (status, progress) => {
          setGenerationStatus(status);
          setGenerationProgress(40 + (progress * 0.4)); // 40-80% range
        }
      );
      
      setGenerationProgress(90);
      setGenerationStatus("Finalizing test generation...");
      
      // Save generated questions to database if they're new AI questions
      if (result.statistics.ai_generated > 0) {
        const aiQuestions = result.questions.filter((q: any) => q.created_by === 'ai');
        // These would be inserted by the edge function or here
      }
      
      setGenerationProgress(100);
      setGenerationStatus("Test generation complete!");
      
      toast.success(`Successfully generated ${result.questions.length} questions!`);
      
      if (result.statistics.ai_generated > 0) {
        toast.info(`Generated ${result.statistics.ai_generated} new AI questions to fill gaps`);
      }
      
      if (result.generation_log.some((log: any) => log.generated > 0)) {
        setTimeout(() => {
          const generatedTopics = result.generation_log
            .filter((log: any) => log.generated > 0)
            .map((log: any) => `${log.topic} (${log.generated} questions)`)
            .join(', ');
          toast.warning(`Generated questions for: ${generatedTopics}`);
        }, 1000);
      }
    } catch (error) {
      console.error('Error generating test:', error);
      toast.error('Failed to generate test. Please try again.');
    } finally {
      setIsGeneratingTest(false);
      setTimeout(() => {
        setGenerationProgress(0);
        setGenerationStatus("");
      }, 2000);
    }
  };

  if (showMatrix && tosMatrix) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            ← Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowMatrix(false)}>
              Edit TOS
            </Button>
            <Button onClick={handleSaveMatrix} variant="default">
              Save TOS Matrix
            </Button>
          </div>
        </div>
        <TOSMatrix data={tosMatrix} />
        
        {/* Sufficiency Analysis */}
        {sufficiencyAnalysis && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Question Bank Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(sufficiencyAnalysis).map(([topic, bloomData]: [string, any]) => (
                <div key={topic} className="mb-4">
                  <h4 className="font-semibold mb-2">{topic}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {Object.entries(bloomData).map(([bloom, data]: [string, any]) => (
                      <div key={bloom} className="flex justify-between items-center p-2 border rounded">
                        <span className="capitalize">{bloom}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">{data.available}</span>
                          <span>/</span>
                          <span className="text-blue-600">{data.needed}</span>
                          {data.shortage > 0 && (
                            <span className="text-red-600">(-{data.shortage})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {Object.values(sufficiencyAnalysis).some((topicData: any) => 
                Object.values(topicData).some((bloomData: any) => bloomData.shortage > 0)
              ) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Some topics have insufficient questions. AI will generate questions to fill gaps during test creation.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Generate Test Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Generate Test from TOS
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Generate a complete test with multiple versions based on this TOS matrix. 
                The system will use existing approved questions and generate AI questions for any gaps.
              </p>
              
              {isGeneratingTest && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{generationStatus}</span>
                    <span>{Math.round(generationProgress)}%</span>
                  </div>
                  <Progress value={generationProgress} />
                </div>
              )}
              
              <Button
                variant="default"
                size="lg"
                className="px-8 py-3"
                onClick={handleGenerateTest}
                disabled={isGeneratingTest || isAnalyzing}
              >
                {isGeneratingTest ? (
                  <>
                    <Brain className="w-5 h-5 mr-2 animate-spin" />
                    {generationStatus || 'Generating Test...'}
                  </>
                ) : (
                  <>
                    🧠 Generate Complete Test from TOS
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-academic-primary">
              <Calculator className="h-5 w-5" />
              Table of Specification Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subjectNo">Subject No.</Label>
                <Input
                  id="subjectNo"
                  {...register("subject_no")}
                  placeholder="e.g., IS 9"
                />
                {errors.subject_no && (
                  <p className="text-sm text-destructive mt-1">{errors.subject_no.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="course">Course</Label>
                <Input
                  id="course"
                  {...register("course")}
                  placeholder="e.g., BSIS"
                />
                {errors.course && (
                  <p className="text-sm text-destructive mt-1">{errors.course.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="subjectDescription">Subject Description</Label>
                <Input
                  id="subjectDescription"
                  {...register("description")}
                  placeholder="e.g., System Analysis and Design"
                />
                {errors.description && (
                  <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="yearSection">Year & Section</Label>
                <Input
                  id="yearSection"
                  {...register("year_section")}
                  placeholder="e.g., BSIS-3A"
                />
                {errors.year_section && (
                  <p className="text-sm text-destructive mt-1">{errors.year_section.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="examPeriod">Exam Period</Label>
                <Input
                  id="examPeriod"
                  {...register("period")}
                  placeholder="e.g., Final Examination"
                />
                {errors.period && (
                  <p className="text-sm text-destructive mt-1">{errors.period.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="schoolYear">School Year</Label>
                <Input
                  id="schoolYear"
                  {...register("school_year")}
                  placeholder="e.g., 2024-2025"
                />
                {errors.school_year && (
                  <p className="text-sm text-destructive mt-1">{errors.school_year.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="totalItems">Total Items</Label>
                <Input
                  id="totalItems"
                  type="number"
                  {...register("total_items", { valueAsNumber: true })}
                  min="10"
                  max="100"
                />
                {errors.total_items && (
                  <p className="text-sm text-destructive mt-1">{errors.total_items.message}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Topics and Hours */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Learning Competencies & Instructional Hours</h3>
                <Button type="button" onClick={addTopic} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Topic
                </Button>
              </div>

              <div className="space-y-3">
                {topics.map((topic, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <Input
                        placeholder="Topic/Learning Competency"
                        value={topic.topic}
                        onChange={(e) => updateTopic(index, "topic", e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        placeholder="Hours"
                        step="0.5"
                        min="0.5"
                        value={topic.hours || ""}
                        onChange={(e) => updateTopic(index, "hours", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    {topics.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeTopic(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {errors.topics && (
                <p className="text-sm text-destructive mt-2">{errors.topics.message}</p>
              )}
            </div>

            {/* Bloom's Taxonomy Distribution Info */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-3">Bloom's Taxonomy Distribution</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>Easy (30%):</strong>
                    <ul className="ml-4 list-disc">
                      <li>Remembering: 15%</li>
                      <li>Understanding: 15%</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Average (40%):</strong>
                    <ul className="ml-4 list-disc">
                      <li>Applying: 20%</li>
                      <li>Analyzing: 20%</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Difficult (30%):</strong>
                    <ul className="ml-4 list-disc">
                      <li>Evaluating: 15%</li>
                      <li>Creating: 15%</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" variant="academic">
              <Calculator className="h-4 w-4 mr-2" />
              Generate TOS Matrix
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};