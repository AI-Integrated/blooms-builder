import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Upload, FileText, CircleCheck as CheckCircle, CircleAlert as AlertCircle, X, Download, Brain, Sparkles, Eye, Save, Pencil, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Questions } from '@/services/db/questions';
import { classifyQuestions } from '@/services/edgeFunctions';
import { classifyBloom, detectKnowledgeDimension, inferDifficulty } from '@/services/ai/classify';
import { useTaxonomyClassification } from '@/hooks/useTaxonomyClassification';
import { resolveSubjectMetadata } from '@/services/ai/subjectMetadataResolver';
import { CATEGORY_CONFIG, getSpecializations, getSubjectCodes } from '@/config/questionBankFilters';

interface BulkImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedQuestion {
  topic: string;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'essay' | 'short_answer';
  choices?: Record<string, string>;
  correct_answer?: string;
  bloom_level?: string;
  difficulty?: string;
  knowledge_dimension?: string;
  created_by: 'teacher' | 'admin' | 'ai';
  approved: boolean;
  needs_review: boolean;
  ai_confidence_score?: number;
  quality_score?: number;
  readability_score?: number;
  classification_confidence?: number;
  validation_status?: string;
  subject?: string;
  grade_level?: string;
  term?: string;
  tags?: string[];
  category?: string;
  specialization?: string;
  subject_code?: string;
  subject_description?: string;
  points_value?: number;
}

interface RowError {
  row: number;
  field: string;
  message: string;
}

interface ImportStats {
  total: number;
  processed: number;
  duplicatesSkipped: number;
  byBloom: Record<string, number>;
  byDifficulty: Record<string, number>;
  byTopic: Record<string, number>;
  byCategory: Record<string, number>;
}

type ImportStep = 'upload' | 'preview' | 'verification' | 'processing' | 'results';

const VALID_BLOOM_LEVELS = ['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'];
const VALID_DIFFICULTIES = ['easy', 'moderate', 'difficult'];
const VALID_QUESTION_TYPES = ['mcq', 'true_false', 'essay', 'short_answer', 'multiple choice', 'true/false', 'tf'];

export default function BulkImport({
  onClose,
  onImportComplete,
}: BulkImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState<ImportStats | null>(null);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('General');
  const [classificationResults, setClassificationResults] = useState<any[]>([]);
  const [showClassificationDetails, setShowClassificationDetails] = useState(false);
  
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [verificationData, setVerificationData] = useState<ParsedQuestion[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { batchClassify, buildTaxonomyMatrix } = useTaxonomyClassification({
    useMLClassifier: true,
    storeResults: true,
    checkSimilarity: true
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
    const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');

    if (isCSV) {
      setFile(file);
      setRowErrors([]);
      previewCSV(file);
    } else if (isPDF) {
      setFile(file);
      setRowErrors([]);
      previewPDF(file);
    } else {
      toast.error('Please upload a CSV or PDF file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    maxSize: 50 * 1024 * 1024,
  });

  const previewCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      preview: 5,
      complete: (results) => {
        setPreviewData(results.data);
        setShowPreview(true);
        setImportStep('preview');
      },
      error: (error) => {
        toast.error(`CSV parsing error: ${error.message}`);
      },
    });
  };

  const extractQuestionsFromPDF = async (file: File): Promise<any[]> => {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        text += pageText + '\n';
      }
      const questions: any[] = [];
      const questionBlocks = text.split(/\n?\d+\.\s+/).filter(block => block.trim());
      
      questionBlocks.forEach((block) => {
        const lines = block.split('\n').filter(line => line.trim());
        if (lines.length === 0) return;
        const questionText = lines[0].trim();
        const choices: Record<string, string> = {};
        let correctAnswer = '';
        
        lines.slice(1).forEach(line => {
          const choiceMatch = line.match(/^([A-F])\.\s*(.+)/);
          if (choiceMatch) {
            const [, letter, text] = choiceMatch;
            choices[letter] = text.trim();
            if (line.includes('*') || line.includes('✓')) {
              correctAnswer = letter;
            }
          }
        });
        
        let questionType: 'mcq' | 'true_false' | 'essay' | 'short_answer' = 'mcq';
        if (Object.keys(choices).length === 0) {
          questionType = 'essay';
        } else if (Object.keys(choices).length === 2 && 
                   (choices.A?.toLowerCase().includes('true') || 
                    choices.A?.toLowerCase().includes('false'))) {
          questionType = 'true_false';
        }
        
        questions.push({
          Question: questionText,
          Type: questionType,
          ...choices,
          Correct: correctAnswer || 'A',
          Topic: selectedTopic,
        });
      });
      
      return questions;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF content');
    }
  };

  const previewPDF = async (file: File) => {
    try {
      setCurrentStep('Extracting text from PDF...');
      const questions = await extractQuestionsFromPDF(file);
      setPreviewData(questions.slice(0, 5));
      setShowPreview(true);
      setImportStep('preview');
      toast.success(`Extracted ${questions.length} questions from PDF`);
    } catch (error) {
      toast.error(`PDF parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper to read a field from a row using multiple possible column names
  const getField = (row: any, ...keys: string[]): string => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
        return String(row[key]).trim();
      }
    }
    return '';
  };

  /** Comprehensive row validation - only Question Text is strictly required.
   *  Metadata fields are optional in CSV and can be filled in the verification step. */
  const validateRow = (row: any, index: number): RowError[] => {
    const errors: RowError[] = [];
    const rowNum = index + 1;

    // Required: Question text
    const questionText = getField(row, 'Question Text', 'Question', 'question_text');
    if (!questionText) {
      errors.push({ row: rowNum, field: 'Question Text', message: 'Question text is required' });
    } else if (questionText.length < 10) {
      errors.push({ row: rowNum, field: 'Question Text', message: 'Question text is too short (minimum 10 characters)' });
    }

    // Validate Category only if provided
    const category = getField(row, 'Category', 'category');
    if (category && !Object.keys(CATEGORY_CONFIG).includes(category)) {
      errors.push({ row: rowNum, field: 'Category', message: `Invalid category "${category}". Must be: ${Object.keys(CATEGORY_CONFIG).join(', ')}` });
    }

    // Validate Specialization only if provided along with valid category
    const specialization = getField(row, 'Specialization', 'specialization');
    if (specialization && category && Object.keys(CATEGORY_CONFIG).includes(category)) {
      const validSpecs = getSpecializations(category);
      if (!validSpecs.includes(specialization)) {
        errors.push({ row: rowNum, field: 'Specialization', message: `Invalid specialization "${specialization}" for category "${category}". Valid: ${validSpecs.join(', ')}` });
      }
    }

    // Validate Cognitive Level (Bloom) only if provided
    const bloom = getField(row, 'Cognitive Level', 'Bloom', 'bloom_level').toLowerCase();
    if (bloom && !VALID_BLOOM_LEVELS.includes(bloom)) {
      errors.push({ row: rowNum, field: 'Cognitive Level', message: `Invalid level "${bloom}". Must be: ${VALID_BLOOM_LEVELS.join(', ')}` });
    }

    // Validate Cognitive Domain (Difficulty) only if provided
    const difficulty = getField(row, 'Cognitive Domain', 'Difficulty', 'difficulty').toLowerCase();
    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      errors.push({ row: rowNum, field: 'Cognitive Domain', message: `Invalid difficulty "${difficulty}". Must be: Easy, Moderate, Difficult` });
    }

    // Validate Points only if provided
    const points = getField(row, 'Points', 'points_value');
    if (points && (isNaN(Number(points)) || Number(points) <= 0)) {
      errors.push({ row: rowNum, field: 'Points', message: 'Points must be a positive number' });
    }

    // Detect question type
    const qType = getField(row, 'Type', 'type', 'question_type').toLowerCase();
    const normalizedType = normalizeQuestionType(qType || 'mcq');

    // Detect MCQ from choices presence
    const hasChoices = !!(getField(row, 'Option A', 'A', 'Choice A') || getField(row, 'Option B', 'B', 'Choice B'));

    if (normalizedType === 'mcq' || hasChoices) {
      const choiceA = getField(row, 'Option A', 'A', 'Choice A');
      const choiceB = getField(row, 'Option B', 'B', 'Choice B');
      const choiceC = getField(row, 'Option C', 'C', 'Choice C');
      const choiceD = getField(row, 'Option D', 'D', 'Choice D');
      
      if (hasChoices) {
        const choices = [choiceA, choiceB, choiceC, choiceD].filter(c => c);
        if (choices.length > 0 && choices.length < 4) {
          errors.push({ row: rowNum, field: 'Options', message: 'Multiple choice questions require exactly 4 choices (Option A–D)' });
        }

        const correct = getField(row, 'Correct Answer', 'Correct', 'correct_answer').toUpperCase();
        if (choices.length >= 4 && correct && !['A', 'B', 'C', 'D'].includes(correct)) {
          errors.push({ row: rowNum, field: 'Correct Answer', message: 'Correct answer must be A, B, C, or D' });
        }
      }
    }

    // True/False validation
    if (normalizedType === 'true_false') {
      const correct = getField(row, 'Correct Answer', 'Correct', 'correct_answer').toLowerCase();
      if (correct && !['true', 'false', 'a', 'b'].includes(correct)) {
        errors.push({ row: rowNum, field: 'Correct Answer', message: 'True/False answer must be "True" or "False"' });
      }
    }

    return errors;
  };

  const normalizeQuestionType = (type: string): ParsedQuestion['question_type'] => {
    const t = type.toLowerCase().trim();
    if (t.includes('true') || t.includes('false') || t === 'tf') return 'true_false';
    if (t.includes('essay')) return 'essay';
    if (t.includes('short') || t.includes('fill')) return 'short_answer';
    return 'mcq';
  };

  const normalizeRow = (row: any): Partial<ParsedQuestion> => {
    const questionText = getField(row, 'Question Text', 'Question', 'question_text');
    const topic = getField(row, 'Topic', 'topic') || selectedTopic || 'General';
    const type = getField(row, 'Type', 'type', 'question_type').toLowerCase();

    // Auto-detect question type from content if not specified
    const hasChoices = !!(getField(row, 'Option A', 'A', 'Choice A') || getField(row, 'Option B', 'B', 'Choice B'));
    let question_type: ParsedQuestion['question_type'];
    if (type) {
      question_type = normalizeQuestionType(type);
    } else if (hasChoices) {
      question_type = 'mcq';
    } else {
      question_type = 'essay';
    }

    let choices: Record<string, string> | undefined;
    if (question_type === 'mcq') {
      choices = {};
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach((letter) => {
        const choice = getField(row, `Option ${letter}`, letter, `Choice ${letter}`, `choice_${letter.toLowerCase()}`);
        if (choice) {
          choices![letter] = choice;
        }
      });
    }

    const csvCategory = getField(row, 'Category', 'category');
    const csvSpecialization = getField(row, 'Specialization', 'specialization');
    const csvSubjectCode = getField(row, 'Subject Code', 'SubjectCode', 'subject_code');
    const csvSubjectDescription = getField(row, 'Subject Description', 'SubjectDescription', 'subject_description');
    const points = Number(getField(row, 'Points', 'points_value') || '1');

    // Use CSV values – support both old and new column names
    const bloom = getField(row, 'Cognitive Level', 'Bloom', 'bloom_level').toLowerCase();
    const difficulty = getField(row, 'Cognitive Domain', 'Difficulty', 'difficulty').toLowerCase();

    return {
      topic: topic,
      question_text: questionText,
      question_type,
      choices,
      correct_answer: getField(row, 'Correct Answer', 'Correct', 'correct_answer'),
      bloom_level: bloom || undefined,
      difficulty: difficulty || undefined,
      knowledge_dimension: getField(row, 'KnowledgeDimension', 'knowledge_dimension', 'Knowledge Dimension') || undefined,
      subject: getField(row, 'Subject', 'subject') || undefined,
      grade_level: getField(row, 'Grade Level', 'grade_level') || undefined,
      term: getField(row, 'Term', 'term') || undefined,
      tags: row.Tags ? (Array.isArray(row.Tags) ? row.Tags : row.Tags.split(',').map((t: string) => t.trim())) : undefined,
      category: csvCategory || undefined,
      specialization: csvSpecialization || undefined,
      subject_code: csvSubjectCode || undefined,
      subject_description: csvSubjectDescription || undefined,
      points_value: isNaN(points) ? 1 : points,
    };
  };

  /** Check for duplicate questions against existing bank */
  const checkDuplicates = async (questions: ParsedQuestion[]): Promise<{ unique: ParsedQuestion[]; duplicateCount: number }> => {
    try {
      const existing = await Questions.getAll({});
      const existingTexts = new Set(existing.map(q => q.question_text.toLowerCase().trim()));
      
      const unique: ParsedQuestion[] = [];
      let duplicateCount = 0;

      // Also check within the import batch itself
      const seenInBatch = new Set<string>();

      for (const q of questions) {
        const normalized = q.question_text.toLowerCase().trim();
        if (existingTexts.has(normalized) || seenInBatch.has(normalized)) {
          duplicateCount++;
        } else {
          seenInBatch.add(normalized);
          unique.push(q);
        }
      }

      return { unique, duplicateCount };
    } catch (error) {
      console.warn('Duplicate check failed, proceeding without:', error);
      return { unique: questions, duplicateCount: 0 };
    }
  };

  /** Step 1: Parse, validate, classify, resolve metadata, then show verification */
  const analyzeAndClassify = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setRowErrors([]);

    try {
      let rawData: any[];

      if (file.name.endsWith('.pdf')) {
        setCurrentStep('Extracting text from PDF...');
        rawData = await extractQuestionsFromPDF(file);
        setProgress(10);
      } else {
        setCurrentStep('Parsing CSV file...');
        const parseResult = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
          Papa.parse(file, { header: true, skipEmptyLines: true, complete: resolve, error: reject });
        });
        rawData = parseResult.data;
        setProgress(10);
      }

      setCurrentStep('Validating required fields...');
      const allErrors: RowError[] = [];
      const validRows: { index: number; data: any }[] = [];

      rawData.forEach((row, index) => {
        const errors = validateRow(row, index);
        if (errors.length > 0) {
          allErrors.push(...errors);
        } else {
          validRows.push({ index, data: row });
        }
      });

      if (allErrors.length > 0) {
        setRowErrors(allErrors);
        if (validRows.length === 0) {
          toast.error(`All ${rawData.length} rows have validation errors. Please fix and re-upload.`);
          setIsProcessing(false);
          return;
        }
        toast.warning(`${allErrors.length} errors found in ${rawData.length - validRows.length} rows. Processing ${validRows.length} valid rows.`);
      }

      setProgress(20);
      const normalizedData: ParsedQuestion[] = validRows.map(({ data }) => ({
        ...normalizeRow(data),
        created_by: 'teacher' as const,
        approved: true,
        needs_review: false,
      } as ParsedQuestion));

      // Duplicate detection
      setCurrentStep('Checking for duplicate questions...');
      setProgress(30);
      const { unique, duplicateCount } = await checkDuplicates(normalizedData);
      
      if (duplicateCount > 0) {
        toast.info(`${duplicateCount} duplicate question(s) detected and will be skipped.`);
      }

      if (unique.length === 0) {
        toast.error('All questions are duplicates of existing ones in the Question Bank.');
        setIsProcessing(false);
        return;
      }

      setProgress(40);
      setCurrentStep('Classifying questions with AI...');

      // AI classification - only fill missing fields
      try {
        const classificationInput = unique.map(q => ({
          text: q.question_text,
          type: q.question_type,
          topic: q.topic
        }));

        const classifications = await classifyQuestions(classificationInput);
        unique.forEach((question, index) => {
          const classification = classifications[index];
          if (classification) {
            if (!question.knowledge_dimension) {
              question.knowledge_dimension = classification.knowledge_dimension;
            }
            question.ai_confidence_score = classification.confidence;
          }
          // Fill missing bloom/difficulty with rule-based fallback
          if (!question.bloom_level) {
            question.bloom_level = classifyBloom(question.question_text);
          }
          if (!question.difficulty) {
            question.difficulty = inferDifficulty(question.bloom_level as any, question.question_text);
          }
        });
        setClassificationResults(classifications);
        toast.success('AI classification completed');
      } catch (aiError) {
        console.warn('AI classification unavailable, using rule-based:', aiError);
        toast.info('Using rule-based classification (AI unavailable)');
        unique.forEach((question) => {
          if (!question.knowledge_dimension) {
            question.knowledge_dimension = detectKnowledgeDimension(question.question_text, question.question_type);
          }
          if (!question.bloom_level) {
            question.bloom_level = classifyBloom(question.question_text);
          }
          if (!question.difficulty) {
            question.difficulty = inferDifficulty(question.bloom_level as any, question.question_text);
          }
          question.ai_confidence_score = 0.6;
        });
      }

      setProgress(70);
      setCurrentStep('Resolving subject metadata...');

      // Resolve metadata for each question
      unique.forEach((q) => {
        const resolved = resolveSubjectMetadata({
          subject: q.subject,
          topic: q.topic,
          subject_code: q.subject_code,
          subject_description: q.subject_description,
          category: q.category,
          specialization: q.specialization,
        });
        q.category = resolved.category;
        q.specialization = resolved.specialization;
        q.subject_code = resolved.subject_code;
        q.subject_description = resolved.subject_description;
      });

      setProgress(100);
      setCurrentStep('Analysis complete');
      setVerificationData(unique);
      setImportStep('verification');
      
      const msg = duplicateCount > 0 
        ? `Analyzed ${unique.length} unique questions (${duplicateCount} duplicates skipped). Please verify before saving.`
        : `Analyzed ${unique.length} questions. Please verify before saving.`;
      toast.success(msg);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRowErrors([{ row: 0, field: 'System', message: error instanceof Error ? error.message : 'Unknown error occurred' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  /** Step 2: Save verified questions to database - all auto-approved */
  const saveVerifiedQuestions = async () => {
    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('Saving to database...');
    setImportStep('processing');

    try {
      const validKnowledgeDimensions = ['factual', 'conceptual', 'procedural', 'metacognitive'];
      const normalizeKD = (val: string | undefined): string => {
        const n = (val || 'conceptual').toLowerCase().trim();
        return validKnowledgeDimensions.includes(n) ? n : 'conceptual';
      };

      const questionsWithDefaults = verificationData.map(q => ({
        topic: q.topic || 'General',
        question_text: q.question_text || '',
        question_type: (q.question_type as 'mcq' | 'true_false' | 'essay' | 'short_answer') || 'mcq',
        choices: q.choices || {},
        correct_answer: q.correct_answer || '',
        bloom_level: (q.bloom_level || 'understanding').toLowerCase(),
        difficulty: (q.difficulty || 'moderate').toLowerCase(),
        knowledge_dimension: normalizeKD(q.knowledge_dimension),
        created_by: 'bulk_import' as const,
        approved: true,
        ai_confidence_score: q.ai_confidence_score || 0.5,
        needs_review: false,
        category: q.category || '',
        specialization: q.specialization || '',
        subject_code: q.subject_code || '',
        subject_description: q.subject_description || '',
      }));

      setProgress(40);

      try {
        await buildTaxonomyMatrix(questionsWithDefaults);
      } catch (matrixError) {
        console.warn('Failed to build taxonomy matrix:', matrixError);
      }

      setProgress(60);
      await Questions.bulkInsert(questionsWithDefaults);
      setProgress(100);
      setCurrentStep('Import completed!');

      const stats: ImportStats = {
        total: verificationData.length,
        processed: verificationData.length,
        duplicatesSkipped: 0,
        byBloom: {},
        byDifficulty: {},
        byTopic: {},
        byCategory: {},
      };
      verificationData.forEach((q) => {
        stats.byBloom[q.bloom_level!] = (stats.byBloom[q.bloom_level!] || 0) + 1;
        stats.byDifficulty[q.difficulty!] = (stats.byDifficulty[q.difficulty!] || 0) + 1;
        stats.byTopic[q.topic] = (stats.byTopic[q.topic] || 0) + 1;
        if (q.category) {
          stats.byCategory[q.category] = (stats.byCategory[q.category] || 0) + 1;
        }
      });

      setResults(stats);
      setImportStep('results');
      toast.success(`Successfully imported ${verificationData.length} questions to the Question Bank!`);
      onImportComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRowErrors([{ row: 0, field: 'System', message: error instanceof Error ? error.message : 'Unknown error occurred' }]);
      setImportStep('verification');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateVerificationField = (index: number, field: keyof ParsedQuestion, value: string) => {
    setVerificationData(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;

      if (field === 'category') {
        updated[index].specialization = '';
        updated[index].subject_code = '';
        updated[index].subject_description = '';
      }
      if (field === 'specialization') {
        updated[index].subject_code = '';
        updated[index].subject_description = '';
      }
      if (field === 'subject_code' && updated[index].category && updated[index].specialization) {
        const subjects = getSubjectCodes(updated[index].category!, updated[index].specialization!);
        const match = subjects.find(s => s.code === value);
        if (match) {
          updated[index].subject_description = match.description;
        }
      }
      return updated;
    });
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Category': 'Major',
        'Specialization': 'IT',
        'Subject Code': 'IT101',
        'Subject Description': 'Introduction to Computing',
        'Question Text': 'Define what a functional requirement is in software development.',
        'Option A': 'A requirement that specifies what the system should do',
        'Option B': 'A requirement that specifies how the system should perform',
        'Option C': 'A requirement that specifies system constraints',
        'Option D': 'A requirement that specifies user interface design',
        'Correct Answer': 'A',
        'Cognitive Domain': 'Easy',
        'Cognitive Level': 'Remembering',
        'Points': '1',
      },
      {
        'Category': 'Major',
        'Specialization': 'IS',
        'Subject Code': 'IS102',
        'Subject Description': 'Systems Analysis and Design',
        'Question Text': 'Explain the difference between conceptual and logical data models.',
        'Option A': '',
        'Option B': '',
        'Option C': '',
        'Option D': '',
        'Correct Answer': 'Conceptual models show high-level entities and relationships, while logical models include detailed attributes and constraints.',
        'Cognitive Domain': 'Moderate',
        'Cognitive Level': 'Understanding',
        'Points': '5',
      },
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'question_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully!');
  };

  const categories = Object.keys(CATEGORY_CONFIG);

  // Group errors by row for better display
  const groupedErrors = rowErrors.reduce<Record<number, RowError[]>>((acc, err) => {
    (acc[err.row] = acc[err.row] || []).push(err);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Import Questions</h2>
          <p className="text-muted-foreground">
            Import questions from CSV with AI-powered classification
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'preview', 'verification', 'results'] as const).map((step, i) => (
          <React.Fragment key={step}>
            {i > 0 && <span className="text-muted-foreground">→</span>}
            <Badge variant={importStep === step ? 'default' : 'outline'} className="capitalize">
              {step === 'verification' ? 'Verify & Edit' : step}
            </Badge>
          </React.Fragment>
        ))}
      </div>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            CSV Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Download our CSV template to ensure your data is formatted correctly. The template includes all required columns:
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {['Category', 'Specialization', 'Subject Code', 'Subject Description', 'Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Cognitive Domain', 'Cognitive Level', 'Points'].map(col => (
              <Badge key={col} variant="secondary" className="text-xs">{col}</Badge>
            ))}
          </div>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      {(importStep === 'upload' || importStep === 'preview') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg">Drop the CSV file here...</p>
              ) : (
                <div>
                  <p className="text-lg mb-2">Drag & drop a CSV or PDF file here, or click to select</p>
                  <p className="text-sm text-muted-foreground">Supports .csv and .pdf files up to 50MB</p>
                </div>
              )}
            </div>

            {file && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{file.name}</span>
                  <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Preview */}
      {showPreview && previewData.length > 0 && importStep === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {Object.keys(previewData[0]).map((key) => (
                      <th key={key} className="text-left p-2 font-medium">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="border-b">
                      {Object.values(row).map((value: any, cellIndex) => (
                        <td key={cellIndex} className="p-2 max-w-xs truncate">{String(value)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Showing first 5 rows. Click "Analyze & Classify" to validate and process all questions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Default Metadata for imported questions */}
      {file && importStep === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Default Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Set default values for fields not included in your CSV. These can be edited per-question in the verification step.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Topic</label>
                <Input
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  placeholder="Enter topic name"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Errors */}
      {rowErrors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Validation Errors ({rowErrors.length} issues in {Object.keys(groupedErrors).length} rows)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(groupedErrors).slice(0, 20).map(([rowNum, errors]) => (
                <div key={rowNum} className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                  <p className="font-medium text-sm mb-1">
                    {Number(rowNum) === 0 ? 'System Error' : `Row ${rowNum}`}
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {errors.map((err, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{err.field}:</span> {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {Object.keys(groupedErrors).length > 20 && (
                <p className="text-sm text-muted-foreground">... and {Object.keys(groupedErrors).length - 20} more rows with errors</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 animate-pulse" />
              {importStep === 'processing' ? 'Saving Questions' : 'Analyzing & Classifying'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{currentStep}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== VERIFICATION STEP ===== */}
      {importStep === 'verification' && verificationData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Verify Classification ({verificationData.length} questions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Review the auto-resolved metadata below. Click any row to edit Category, Specialization, Subject Code, or Subject Description before saving. All questions will be automatically saved to the Question Bank.
            </p>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium w-8">#</th>
                    <th className="text-left p-2 font-medium min-w-[200px]">Question</th>
                    <th className="text-left p-2 font-medium">Topic</th>
                    <th className="text-left p-2 font-medium">Bloom</th>
                    <th className="text-left p-2 font-medium">Difficulty</th>
                    <th className="text-left p-2 font-medium">Category</th>
                    <th className="text-left p-2 font-medium">Specialization</th>
                    <th className="text-left p-2 font-medium">Subject Code</th>
                    <th className="text-left p-2 font-medium min-w-[180px]">Subject Description</th>
                    <th className="text-left p-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {verificationData.map((q, idx) => {
                    const isEditing = editingIndex === idx;
                    const availableSpecs = q.category ? getSpecializations(q.category) : [];
                    const availableSubjects = q.category && q.specialization ? getSubjectCodes(q.category, q.specialization) : [];

                    return (
                      <tr key={idx} className={`border-b ${isEditing ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                        <td className="p-2 text-muted-foreground">{idx + 1}</td>
                        <td className="p-2 max-w-[250px] truncate" title={q.question_text}>{q.question_text}</td>
                        <td className="p-2">{q.topic}</td>
                        <td className="p-2 capitalize">{q.bloom_level}</td>
                        <td className="p-2 capitalize">{q.difficulty}</td>
                        <td className="p-2">
                          {isEditing ? (
                            <Select value={q.category || ''} onValueChange={(v) => updateVerificationField(idx, 'category', v)}>
                              <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">{q.category || '—'}</Badge>
                          )}
                        </td>
                        <td className="p-2">
                          {isEditing ? (
                            <Select value={q.specialization || ''} onValueChange={(v) => updateVerificationField(idx, 'specialization', v)}>
                              <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {availableSpecs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">{q.specialization || '—'}</Badge>
                          )}
                        </td>
                        <td className="p-2">
                          {isEditing ? (
                            <Select value={q.subject_code || ''} onValueChange={(v) => updateVerificationField(idx, 'subject_code', v)}>
                              <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {availableSubjects.map(s => <SelectItem key={s.code} value={s.code}>{s.code} - {s.description}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            q.subject_code || '—'
                          )}
                        </td>
                        <td className="p-2 max-w-[180px] truncate" title={q.subject_description}>
                          {q.subject_description || '—'}
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setEditingIndex(isEditing ? null : idx)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && importStep === 'results' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Import Results
              </div>
              <Button onClick={() => setShowClassificationDetails(!showClassificationDetails)} variant="outline" size="sm">
                {showClassificationDetails ? 'Hide' : 'Show'} Classification Details
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{results.total}</div>
                <div className="text-sm text-muted-foreground">Total Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{results.processed}</div>
                <div className="text-sm text-muted-foreground">Saved to Question Bank</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{Object.keys(results.byTopic).length}</div>
                <div className="text-sm text-muted-foreground">Topics</div>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <h4 className="font-medium mb-2">By Bloom Level</h4>
                <div className="space-y-1">
                  {Object.entries(results.byBloom).map(([level, count]) => (
                    <div key={level} className="flex justify-between text-sm">
                      <span className="capitalize">{level}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">By Difficulty</h4>
                <div className="space-y-1">
                  {Object.entries(results.byDifficulty).map(([difficulty, count]) => (
                    <div key={difficulty} className="flex justify-between text-sm">
                      <span className="capitalize">{difficulty}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">By Category</h4>
                <div className="space-y-1">
                  {Object.entries(results.byCategory).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between text-sm">
                      <span>{cat}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">By Topic</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Object.entries(results.byTopic).map(([topic, count]) => (
                    <div key={topic} className="flex justify-between text-sm">
                      <span className="truncate">{topic}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>

          {showClassificationDetails && classificationResults.length > 0 && (
            <CardContent className="border-t">
              <div className="space-y-4">
                <h4 className="font-semibold">AI Classification Analysis</h4>
                <div className="text-sm space-y-2">
                  <p><strong>Average Confidence:</strong> {(classificationResults.reduce((sum, c) => sum + c.confidence, 0) / classificationResults.length * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {importStep === 'preview' && file && !isProcessing && (
          <Button onClick={analyzeAndClassify} className="flex-1">
            <Sparkles className="h-4 w-4 mr-2" />
            Analyze & Classify
          </Button>
        )}

        {importStep === 'verification' && !isProcessing && (
          <>
            <Button variant="outline" onClick={() => { setImportStep('preview'); setVerificationData([]); }}>
              Back
            </Button>
            <Button onClick={saveVerifiedQuestions} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save {verificationData.length} Questions to Question Bank
            </Button>
          </>
        )}

        {importStep === 'results' && (
          <Button onClick={onClose} className="flex-1">
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete
          </Button>
        )}
      </div>
    </div>
  );
}
