import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BulkImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedQuestion {
  topic: string;
  question_text: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  choice_d?: string;
  correct_answer?: string;
}

interface ClassifiedQuestion extends ParsedQuestion {
  bloom_level: string;
  difficulty: string;
  knowledge_dimension: string;
  question_type: string;
  ai_confidence_score: number;
  needs_review: boolean;
}

const BulkImport: React.FC<BulkImportProps> = ({ onClose, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [classifiedQuestions, setClassifiedQuestions] = useState<ClassifiedQuestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'upload' | 'classify' | 'review' | 'import'>('upload');
  const [errors, setErrors] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      parseFile(uploadedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  const parseFile = (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const questions = results.data as ParsedQuestion[];
          const validQuestions = questions.filter(q => q.topic && q.question_text);
          setParsedQuestions(validQuestions);
          setCurrentStep('classify');
          
          if (results.errors.length > 0) {
            setErrors(results.errors.map(err => err.message));
          }
        },
        error: (error) => {
          setErrors([`CSV parsing error: ${error.message}`]);
        }
      });
    } else {
      setErrors(['Only CSV files are currently supported. Excel support coming soon!']);
    }
  };

  const classifyQuestions = async () => {
    if (parsedQuestions.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Process questions in batches of 5 to avoid rate limits
      const batchSize = 5;
      const classified: ClassifiedQuestion[] = [];
      
      for (let i = 0; i < parsedQuestions.length; i += batchSize) {
        const batch = parsedQuestions.slice(i, i + batchSize);
        
        // Format questions for API
        const formattedQuestions = batch.map(q => ({
          topic: q.topic,
          question_text: q.question_text,
          choices: q.choice_a ? {
            A: q.choice_a,
            B: q.choice_b || '',
            C: q.choice_c || '',
            D: q.choice_d || ''
          } : undefined,
          correct_answer: q.correct_answer
        }));

        const { data, error } = await supabase.functions.invoke('classify-questions', {
          body: { questions: formattedQuestions }
        });

        if (error) {
          throw new Error(`Classification error: ${error.message}`);
        }

        if (data.success) {
          classified.push(...data.classified_questions);
        }
        
        setProgress((i + batchSize) / parsedQuestions.length * 100);
      }
      
      setClassifiedQuestions(classified);
      setCurrentStep('review');
      toast({
        title: "Classification Complete",
        description: `Successfully classified ${classified.length} questions`,
      });
      
    } catch (error) {
      console.error('Classification error:', error);
      setErrors([`Classification failed: ${error.message}`]);
      toast({
        title: "Classification Failed",
        description: "Please try again or check your questions format",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const importQuestions = async () => {
    if (classifiedQuestions.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('import');
    
    try {
      const questionsToInsert = classifiedQuestions.map(q => ({
        topic: q.topic,
        question_text: q.question_text,
        question_type: q.question_type,
        choices: q.choice_a ? {
          A: q.choice_a,
          B: q.choice_b || '',
          C: q.choice_c || '',
          D: q.choice_d || ''
        } : null,
        correct_answer: q.correct_answer || null,
        bloom_level: q.bloom_level,
        difficulty: q.difficulty,
        knowledge_dimension: q.knowledge_dimension,
        ai_confidence_score: q.ai_confidence_score,
        needs_review: q.needs_review,
        created_by: 'bulk_import'
      }));

      // Add AI auto-approval logic
      const questionsWithApproval = questionsToInsert.map(question => ({
        ...question,
        // Auto-approve if AI confidence is high (>= 0.8)
        approved: (question.ai_confidence_score || 0) >= 0.8,
        approved_by: (question.ai_confidence_score || 0) >= 0.8 ? 'AI' : null,
        approval_confidence: question.ai_confidence_score,
        approval_notes: (question.ai_confidence_score || 0) >= 0.8 
          ? 'Auto-approved by AI due to high confidence score' 
          : 'Requires manual review due to low confidence score'
      }));

      const { error } = await (supabase as any)
        .from('questions')
        .insert(questionsWithApproval);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      setProgress(100);
      toast({
        title: "Import Successful",
        description: `Successfully imported ${questionsToInsert.length} questions`,
      });
      
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Import error:', error);
      setErrors([`Import failed: ${error.message}`]);
      toast({
        title: "Import Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setParsedQuestions([]);
    setClassifiedQuestions([]);
    setCurrentStep('upload');
    setErrors([]);
    setProgress(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Import Questions</h2>
          <p className="text-muted-foreground">
            Upload a CSV file and let AI classify your questions automatically
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Close
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4">
        {['upload', 'classify', 'review', 'import'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === step ? 'bg-primary text-primary-foreground' :
              ['upload', 'classify', 'review', 'import'].indexOf(currentStep) > index ? 'bg-green-500 text-white' :
              'bg-muted text-muted-foreground'
            }`}>
              {['upload', 'classify', 'review', 'import'].indexOf(currentStep) > index ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className="ml-2 text-sm capitalize">{step}</span>
            {index < 3 && <div className="w-8 h-px bg-border mx-4" />}
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Step 1: File Upload */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Upload CSV File
            </CardTitle>
            <CardDescription>
              Upload a CSV file with columns: topic, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p>Drop the CSV file here...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">
                    Drag & drop a CSV file here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supported formats: CSV (Excel support coming soon)
                  </p>
                </div>
              )}
            </div>
            
            {file && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB • {parsedQuestions.length} questions found
                    </p>
                  </div>
                  <Button onClick={resetImport} variant="outline" size="sm">
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Classification */}
      {currentStep === 'classify' && (
        <Card>
          <CardHeader>
            <CardTitle>AI Classification</CardTitle>
            <CardDescription>
              {parsedQuestions.length} questions ready for AI classification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Questions will be classified by:</span>
              <div className="flex space-x-2">
                <Badge variant="outline">Bloom's Level</Badge>
                <Badge variant="outline">Difficulty</Badge>
                <Badge variant="outline">Knowledge Type</Badge>
              </div>
            </div>
            
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Classifying questions...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
            
            <Button 
              onClick={classifyQuestions} 
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? 'Classifying...' : 'Start AI Classification'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {currentStep === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Review Classifications</CardTitle>
            <CardDescription>
              Review the AI classifications before importing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Questions:</span>
                <p className="text-2xl font-bold">{classifiedQuestions.length}</p>
              </div>
              <div>
                <span className="font-medium">Need Review:</span>
                <p className="text-2xl font-bold text-yellow-600">
                  {classifiedQuestions.filter(q => q.needs_review).length}
                </p>
              </div>
              <div>
                <span className="font-medium">High Confidence:</span>
                <p className="text-2xl font-bold text-green-600">
                  {classifiedQuestions.filter(q => q.ai_confidence_score >= 0.8).length}
                </p>
              </div>
              <div>
                <span className="font-medium">MCQ Questions:</span>
                <p className="text-2xl font-bold">
                  {classifiedQuestions.filter(q => q.question_type === 'mcq').length}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {classifiedQuestions.slice(0, 5).map((question, index) => (
                <div key={index} className="p-3 border rounded-lg text-sm">
                  <p className="font-medium mb-2">{question.question_text}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{question.topic}</Badge>
                    <Badge variant="outline">{question.bloom_level}</Badge>
                    <Badge variant="outline">{question.difficulty}</Badge>
                    <Badge variant="outline">{question.knowledge_dimension}</Badge>
                    {question.needs_review && (
                      <Badge variant="destructive">Needs Review</Badge>
                    )}
                  </div>
                </div>
              ))}
              {classifiedQuestions.length > 5 && (
                <p className="text-center text-muted-foreground">
                  ... and {classifiedQuestions.length - 5} more questions
                </p>
              )}
            </div>
            
            <Button onClick={importQuestions} className="w-full">
              Import All Questions
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Import Progress */}
      {currentStep === 'import' && (
        <Card>
          <CardHeader>
            <CardTitle>Importing Questions</CardTitle>
            <CardDescription>
              Adding questions to the database...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Import progress...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
            
            {progress === 100 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully imported {classifiedQuestions.length} questions!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkImport;