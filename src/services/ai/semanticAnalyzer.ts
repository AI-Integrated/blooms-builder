/**
 * Semantic Similarity Analysis Service
 * Uses OpenAI embeddings to detect similar and duplicate questions
 */

import { supabase } from '@/integrations/supabase/client';

export interface SimilarQuestion {
  id: string;
  question_text: string;
  topic: string;
  similarity_score: number;
  bloom_level?: string;
  difficulty?: string;
}

export interface SimilarityResult {
  question_id: string;
  similar_questions: SimilarQuestion[];
  has_duplicates: boolean;
  highest_similarity: number;
}

export interface ClusterResult {
  clusterId: string;
  questions: string[];
  centroid: number[];
  coherence: number;
  topic: string;
}

/**
 * Generate embedding for a text using OpenAI API via edge function
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: { text }
    });

    if (error) throw error;
    
    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

/**
 * Find similar questions to a given question
 */
export async function findSimilarQuestions(
  questionId: string,
  topK: number = 10,
  threshold: number = 0.75
): Promise<SimilarQuestion[]> {
  try {
    // Get the question and its embedding
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, question_text, semantic_vector')
      .eq('id', questionId)
      .single();

    if (questionError) throw questionError;
    if (!question.semantic_vector) {
      throw new Error('Question does not have an embedding yet');
    }

    const queryVector = JSON.parse(question.semantic_vector);

    // Get all other questions with embeddings
    const { data: allQuestions, error: allError } = await supabase
      .from('questions')
      .select('id, question_text, topic, bloom_level, difficulty, semantic_vector')
      .neq('id', questionId)
      .not('semantic_vector', 'is', null);

    if (allError) throw allError;

    // Calculate similarities
    const similarities: SimilarQuestion[] = [];

    for (const q of allQuestions || []) {
      if (!q.semantic_vector) continue;

      const targetVector = JSON.parse(q.semantic_vector);
      const similarity = cosineSimilarity(queryVector, targetVector);

      if (similarity >= threshold) {
        similarities.push({
          id: q.id,
          question_text: q.question_text,
          topic: q.topic,
          similarity_score: similarity,
          bloom_level: q.bloom_level,
          difficulty: q.difficulty
        });
      }
    }

    // Sort by similarity (highest first) and take topK
    similarities.sort((a, b) => b.similarity_score - a.similarity_score);
    return similarities.slice(0, topK);

  } catch (error) {
    console.error('Error finding similar questions:', error);
    throw error;
  }
}

/**
 * Store similarity pairs in the database
 */
export async function storeSimilarityPairs(
  questionId: string,
  similarQuestions: SimilarQuestion[]
): Promise<void> {
  try {
    const pairs = similarQuestions.map(sq => ({
      question1_id: questionId,
      question2_id: sq.id,
      similarity_score: sq.similarity_score,
      algorithm_used: 'openai-text-embedding-3-small-cosine'
    }));

    const { error } = await supabase
      .from('question_similarities')
      .upsert(pairs, {
        onConflict: 'question1_id,question2_id'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error storing similarity pairs:', error);
    throw error;
  }
}

/**
 * Index a single question - generate embedding and find similarities
 */
export async function indexQuestion(questionId: string): Promise<SimilarityResult> {
  try {
    const startTime = performance.now();

    // Call the edge function to handle embedding and similarity calculation
    const { data, error } = await supabase.functions.invoke('update-semantic', {
      body: { question_id: questionId }
    });

    if (error) {
      console.error('Error calling update-semantic function:', error);
      throw error;
    }

    const duration = performance.now() - startTime;
    console.log(`Semantic indexing completed for ${questionId} in ${duration}ms`);

    // Fetch similar questions from database
    const similarQuestions = await findSimilarQuestions(questionId, 10, 0.75);

    const hasDuplicates = similarQuestions.some(sq => sq.similarity_score >= 0.85);
    const highestSimilarity = similarQuestions.length > 0 
      ? similarQuestions[0].similarity_score 
      : 0;

    return {
      question_id: questionId,
      similar_questions: similarQuestions,
      has_duplicates: hasDuplicates,
      highest_similarity: highestSimilarity
    };

  } catch (error) {
    console.error('Error indexing question:', error);
    throw error;
  }
}

/**
 * Batch index all questions that don't have embeddings
 */
export async function indexAllQuestions(
  batchSize: number = 50,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  try {
    // Get all questions without embeddings
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id')
      .is('semantic_vector', null);

    if (error) throw error;

    const total = questions?.length || 0;
    console.log(`Indexing ${total} questions...`);

    // Process in batches to avoid rate limits
    for (let i = 0; i < total; i += batchSize) {
      const batch = questions!.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(q => indexQuestion(q.id))
      );

      if (onProgress) {
        onProgress(Math.min(i + batchSize, total), total);
      }

      // Small delay to respect rate limits
      if (i + batchSize < total) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('All questions indexed successfully');
  } catch (error) {
    console.error('Error in batch indexing:', error);
    throw error;
  }
}

/**
 * Get similarity clusters - groups of similar questions
 */
export async function getSimilarityClusters(
  threshold: number = 0.85
): Promise<Array<SimilarQuestion[]>> {
  try {
    const { data: similarities, error } = await supabase
      .from('question_similarities')
      .select(`
        question1_id,
        question2_id,
        similarity_score
      `)
      .gte('similarity_score', threshold);

    if (error) throw error;

    // Build clusters using union-find or simple grouping
    const clusters: Map<string, Set<string>> = new Map();
    
    for (const sim of similarities || []) {
      const q1 = sim.question1_id;
      const q2 = sim.question2_id;
      
      // Find existing cluster
      let cluster: Set<string> | undefined;
      for (const [_, c] of clusters) {
        if (c.has(q1) || c.has(q2)) {
          cluster = c;
          break;
        }
      }
      
      if (cluster) {
        cluster.add(q1);
        cluster.add(q2);
      } else {
        const newCluster = new Set([q1, q2]);
        clusters.set(q1, newCluster);
      }
    }

    // Convert to array of question objects
    const result: Array<SimilarQuestion[]> = [];
    for (const cluster of clusters.values()) {
      if (cluster.size >= 2) {
        const questions = await Promise.all(
          Array.from(cluster).map(async id => {
            const { data } = await supabase
              .from('questions')
              .select('id, question_text, topic, bloom_level, difficulty')
              .eq('id', id)
              .single();
            
            return data ? {
              id: data.id,
              question_text: data.question_text,
              topic: data.topic,
              bloom_level: data.bloom_level,
              difficulty: data.difficulty,
              similarity_score: 1.0
            } : null;
          })
        );
        
        const validQuestions = questions.filter(q => q !== null) as SimilarQuestion[];
        if (validQuestions.length >= 2) {
          result.push(validQuestions);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error getting similarity clusters:', error);
    throw error;
  }
}

// Export backward compatible function
export function calculateCosineSimilarity(text1: string, text2: string, vector1?: string, vector2?: string): number {
  // Simple word overlap similarity if no vectors provided
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}