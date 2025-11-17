import { supabase } from "@/integrations/supabase/client";

export interface TOSCriteria {
  topic: string;
  bloom_level: string;
  knowledge_dimension?: string;
  difficulty: string;
  count: number;
}

export interface GeneratedTest {
  id: string;
  title: string;
  questions: any[];
  answer_key: any[];
  generated_at: string;
}

/**
 * Generate a test based on Table of Specifications
 * This function implements the non-redundant question selection mechanism
 */
export async function generateTestFromTOS(
  tosCriteria: TOSCriteria[],
  testTitle: string,
  testMetadata?: any
): Promise<GeneratedTest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const selectedQuestions: any[] = [];
  const answerKey: any[] = [];
  let questionNumber = 1;

  for (const criteria of tosCriteria) {
    // Step 1: Query existing approved questions matching criteria
    const { data: existingQuestions, error: queryError } = await supabase
      .from('questions')
      .select('*')
      .eq('topic', criteria.topic)
      .eq('bloom_level', criteria.bloom_level)
      .eq('difficulty', criteria.difficulty)
      .eq('approved', true)
      .eq('status', 'approved')
      .eq('deleted', false);

    if (queryError) {
      console.error("Error querying questions:", queryError);
      continue;
    }

    let questionsToUse: any[] = [];

    if (existingQuestions && existingQuestions.length >= criteria.count) {
      // Step 2: Use semantic similarity to select non-redundant questions
      questionsToUse = await selectNonRedundantQuestions(
        existingQuestions,
        criteria.count
      );
    } else {
      // Step 3: Need to generate new questions via AI
      const neededCount = criteria.count - (existingQuestions?.length || 0);
      
      // Use existing questions first
      questionsToUse = existingQuestions || [];

      // Generate new questions
      const newQuestions = await generateQuestionsWithAI(
        criteria,
        neededCount,
        user.id
      );

      questionsToUse = [...questionsToUse, ...newQuestions];
    }

    // Add to test with question numbers
    questionsToUse.forEach(q => {
      selectedQuestions.push({
        ...q,
        question_number: questionNumber++
      });
      
      answerKey.push({
        question_number: questionNumber - 1,
        question_id: q.id,
        correct_answer: q.correct_answer,
        points: 1
      });
    });
  }

  // Step 4: Store generated test
  const { data: generatedTest, error: insertError } = await supabase
    .from('generated_tests')
    .insert({
      title: testTitle,
      subject: testMetadata?.subject || null,
      course: testMetadata?.course || null,
      year_section: testMetadata?.year_section || null,
      exam_period: testMetadata?.exam_period || null,
      school_year: testMetadata?.school_year || null,
      items: selectedQuestions,
      answer_key: answerKey,
      tos_id: testMetadata?.tos_id || null,
      points_per_question: testMetadata?.points_per_question || 1
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return {
    id: generatedTest.id,
    title: generatedTest.title,
    questions: selectedQuestions,
    answer_key: answerKey,
    generated_at: generatedTest.created_at
  };
}

/**
 * Select non-redundant questions using semantic similarity
 * Ensures selected questions have similarity < 0.85
 */
async function selectNonRedundantQuestions(
  questions: any[],
  count: number
): Promise<any[]> {
  const selected: any[] = [];
  const similarityThreshold = 0.85;

  // Sort by usage count (prefer less-used questions)
  const sortedQuestions = [...questions].sort((a, b) => 
    (a.used_count || 0) - (b.used_count || 0)
  );

  for (const question of sortedQuestions) {
    if (selected.length >= count) break;

    // Check semantic similarity with already selected questions
    let isSimilar = false;
    
    for (const selectedQ of selected) {
      if (question.semantic_vector && selectedQ.semantic_vector) {
        // Use check_question_similarity function
        const { data: similarQuestions } = await supabase
          .rpc('check_question_similarity', {
            p_question_text: question.question_text,
            p_topic: question.topic,
            p_bloom_level: question.bloom_level,
            p_threshold: similarityThreshold
          });

        if (similarQuestions && similarQuestions.length > 0) {
          // Check if any similar question is already selected
          const similarToSelected = similarQuestions.some((sq: any) => 
            selected.some(s => s.id === sq.similar_question_id)
          );
          if (similarToSelected) {
            isSimilar = true;
            break;
          }
        }
      }
    }

    if (!isSimilar) {
      selected.push(question);
      
      // Mark question as used
      await supabase.rpc('mark_question_used', { 
        p_question_id: question.id,
        p_test_id: null
      });
    }
  }

  return selected;
}

/**
 * Generate new questions using AI when existing questions are insufficient
 */
async function generateQuestionsWithAI(
  criteria: TOSCriteria,
  count: number,
  userId: string
): Promise<any[]> {
  // Use the edge function to generate questions with proper distribution
  const { data, error } = await supabase.functions.invoke('generate-questions-from-tos', {
    body: {
      tos_id: 'temp-generation',
      total_items: count,
      distributions: [{
        topic: criteria.topic,
        counts: {
          remembering: criteria.bloom_level.toLowerCase() === 'remembering' ? count : 0,
          understanding: criteria.bloom_level.toLowerCase() === 'understanding' ? count : 0,
          applying: criteria.bloom_level.toLowerCase() === 'applying' ? count : 0,
          analyzing: criteria.bloom_level.toLowerCase() === 'analyzing' ? count : 0,
          evaluating: criteria.bloom_level.toLowerCase() === 'evaluating' ? count : 0,
          creating: criteria.bloom_level.toLowerCase() === 'creating' ? count : 0,
          difficulty: {
            easy: criteria.difficulty.toLowerCase() === 'easy' ? count : 0,
            average: criteria.difficulty.toLowerCase() === 'average' ? count : 0,
            difficult: criteria.difficulty.toLowerCase() === 'difficult' ? count : 0
          }
        }
      }],
      allow_unapproved: false,
      prefer_existing: true
    }
  });

  if (error) {
    console.error("Error generating questions:", error);
    throw new Error("Failed to generate questions: " + (error.message || "Unknown error"));
  }

  const generatedQuestions = data?.questions || [];

  // Filter for only AI-generated questions that need to be saved
  const questionsToSave = generatedQuestions.filter((q: any) => q.created_by === 'ai');

  if (questionsToSave.length === 0) {
    // All questions came from existing bank
    return generatedQuestions;
  }

  // Store AI-generated questions into the question bank for reuse
  const questionsToInsert = questionsToSave.map((q: any) => ({
    question_text: q.question_text,
    question_type: q.question_type,
    choices: q.choices,
    correct_answer: q.correct_answer,
    topic: q.topic,
    bloom_level: q.bloom_level,
    difficulty: q.difficulty,
    knowledge_dimension: q.knowledge_dimension,
    created_by: 'ai',
    status: 'approved',
    approved: true,
    owner: userId,
    ai_confidence_score: q.ai_confidence_score || 0.6,
    needs_review: q.needs_review || true,
    metadata: q.metadata || {}
  }));

  const { data: insertedQuestions, error: insertError } = await supabase
    .from('questions')
    .insert(questionsToInsert)
    .select();

  if (insertError) {
    console.error("Error inserting generated questions:", insertError);
    // Don't throw - use the generated questions even if save fails
    return generatedQuestions;
  }

  // Log AI generation for tracking
  for (const question of insertedQuestions || []) {
    await supabase.from('ai_generation_logs').insert({
      question_id: question.id,
      generation_type: 'tos_generation',
      prompt_used: `Generate ${criteria.bloom_level} question on ${criteria.topic} with ${criteria.difficulty} difficulty`,
      model_used: 'fallback_template',
      generated_by: userId
    });
  }

  // Generate semantic vectors for new questions (async, don't wait)
  for (const question of insertedQuestions || []) {
    supabase.functions.invoke('update-semantic', {
      body: {
        question_id: question.id,
        question_text: question.question_text
      }
    }).catch(err => console.error('Error updating semantic vector:', err));
  }

  // Return the inserted questions with their IDs
  return insertedQuestions || generatedQuestions;
}

/**
 * Generate automatic answer key for a test
 */
export function generateAnswerKey(questions: any[]): any[] {
  return questions.map((q, index) => ({
    question_number: index + 1,
    question_id: q.id,
    correct_answer: q.correct_answer,
    question_text: q.question_text,
    points: 1,
    bloom_level: q.bloom_level,
    topic: q.topic
  }));
}