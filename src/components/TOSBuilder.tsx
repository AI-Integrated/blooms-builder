import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Calculator, Users } from "lucide-react";
import { toast } from "sonner";
import { TOSMatrix } from "./TOSMatrix";
import { useCollaborativeEditing } from "@/hooks/useCollaborativeEditing";
import { CollaborationIndicator } from "./CollaborationIndicator";
import { supabase } from "@/integrations/supabase/client";
import { CollaborativeDocumentManager } from "./CollaborativeDocumentManager";

const topicSchema = z.object({
  topic: z.string().min(1, "Topic name is required"),
  hours: z.number().min(0.5, "Minimum 0.5 hours required")
});

const tosSchema = z.object({
  subjectNo: z.string().min(1, "Subject number is required"),
  course: z.string().min(1, "Course is required"),
  subjectDescription: z.string().min(1, "Subject description is required"),
  yearSection: z.string().min(1, "Year & section is required"),
  examPeriod: z.string().min(1, "Exam period is required"),
  schoolYear: z.string().min(1, "School year is required"),
  totalItems: z.number().min(10, "Minimum 10 items required").max(100, "Maximum 100 items allowed"),
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
  const [showCollaboration, setShowCollaboration] = useState(false);

  // Generate document ID for collaboration
  const documentId = `tos-builder-${Date.now()}`;
  
  const form = useForm<TOSFormData>({
    resolver: zodResolver(tosSchema),
    defaultValues: {
      totalItems: 50,
      topics: topics
    }
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;

  const {
    users,
    documentData,
    isConnected,
    currentUser,
    broadcastChange,
    saveToDatabase
  } = useCollaborativeEditing({
    documentId,
    documentType: 'tos',
    initialData: { topics },
    onDataChange: (data) => {
      if (data.topics) {
        setTopics(data.topics);
        form.reset(data);
      }
    }
  });

  const watchedTotalItems = watch("totalItems");

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
    
    // Broadcast changes for collaborative editing
    broadcastChange({ topics: newTopics });
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
      const topicItems = Math.round(data.totalItems * topicPercentage);
      
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
    while (itemCounter <= data.totalItems) {
      // Add remaining items to the first topic's "understanding" level
      const firstTopic = data.topics[0].topic;
      distribution[firstTopic].understanding.push(itemCounter);
      itemCounter++;
    }

    return {
      formData: data,
      distribution,
      totalHours,
      createdBy: "Teacher",
      createdAt: new Date().toISOString()
    };
  };

  const onSubmit = (data: TOSFormData) => {
    const matrix = calculateTOSMatrix(data);
    if (matrix) {
      setTosMatrix(matrix);
      setShowMatrix(true);
      toast.success("TOS Matrix generated successfully!");
    }
  };

  const handleSaveMatrix = () => {
    if (tosMatrix) {
      // TODO: Save to database
      toast.success("TOS saved successfully!");
    }
  };

  const handleGenerateQuestions = async () => {
    if (!tosMatrix) return;
    
    try {
      toast.loading("Generating questions from TOS matrix...");
      
      const { data, error } = await supabase.functions.invoke('generate-questions-from-tos', {
        body: { tosMatrix }
      });
      
      if (error) throw error;
      
      // Save generated questions to database
      if (data.questions && data.questions.length > 0) {
        const questionsToSave = data.questions.map((q: any) => ({
          question_text: q.question_text,
          question_type: q.question_type,
          choices: q.choices,
          correct_answer: q.correct_answer,
          bloom_level: q.bloom_level,
          difficulty: q.difficulty,
          topic: q.topic,
          knowledge_dimension: q.knowledge_dimension || 'factual',
          created_by: 'AI Generated from TOS'
        }));
        
        const { error: saveError } = await supabase
          .from('questions')
          .insert(questionsToSave);
          
        if (saveError) throw saveError;
        
        toast.success(`Successfully generated ${data.questions.length} questions from TOS!`);
        
        // Navigate to Question Bank to view generated questions
        // You could add navigation logic here if needed
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error('Failed to generate questions. Please try again.');
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
        
        {/* Generate Questions Section */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Once your TOS is finalized, click below to automatically generate matching test questions based on your instructional plan.
              </p>
              <Button
                variant="default"
                size="lg"
                className="px-8 py-3"
                onClick={handleGenerateQuestions}
              >
                🧠 Generate Questions from This TOS
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-academic-primary">
              <Calculator className="h-5 w-5" />
              Table of Specification Builder
            </div>
            <div className="flex items-center gap-2">
              <CollaborationIndicator 
                users={users}
                isConnected={isConnected}
                currentUser={currentUser}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCollaboration(!showCollaboration)}
              >
                <Users className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </CardTitle>
          {showCollaboration && (
            <div className="mt-4">
              <CollaborativeDocumentManager
                documentId={documentId}
                documentType="tos"
                documentTitle="Table of Specification"
                currentUserEmail="teacher@example.com"
                isOwner={true}
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subjectNo">Subject No.</Label>
                <Input
                  id="subjectNo"
                  {...register("subjectNo")}
                  placeholder="e.g., IS 9"
                />
                {errors.subjectNo && (
                  <p className="text-sm text-destructive mt-1">{errors.subjectNo.message}</p>
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
                  {...register("subjectDescription")}
                  placeholder="e.g., System Analysis and Design"
                />
                {errors.subjectDescription && (
                  <p className="text-sm text-destructive mt-1">{errors.subjectDescription.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="yearSection">Year & Section</Label>
                <Input
                  id="yearSection"
                  {...register("yearSection")}
                  placeholder="e.g., BSIS-3A"
                />
                {errors.yearSection && (
                  <p className="text-sm text-destructive mt-1">{errors.yearSection.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="examPeriod">Exam Period</Label>
                <Input
                  id="examPeriod"
                  {...register("examPeriod")}
                  placeholder="e.g., Final Examination"
                />
                {errors.examPeriod && (
                  <p className="text-sm text-destructive mt-1">{errors.examPeriod.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="schoolYear">School Year</Label>
                <Input
                  id="schoolYear"
                  {...register("schoolYear")}
                  placeholder="e.g., 2024-2025"
                />
                {errors.schoolYear && (
                  <p className="text-sm text-destructive mt-1">{errors.schoolYear.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="totalItems">Total Items</Label>
                <Input
                  id="totalItems"
                  type="number"
                  {...register("totalItems", { valueAsNumber: true })}
                  min="10"
                  max="100"
                />
                {errors.totalItems && (
                  <p className="text-sm text-destructive mt-1">{errors.totalItems.message}</p>
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