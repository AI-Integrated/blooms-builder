/**
 * Subject Deduplication Service
 * 
 * Before saving a question, checks if a record with the same subject_description
 * but a different subject_code already exists. If so, updates those existing records
 * to use the new subject_code instead of creating duplicate entries.
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * Checks for existing questions with the same subject_description but different subject_code.
 * If found, updates their subject_code to match the incoming one.
 */
export async function deduplicateSubjectCode(
  subject_description: string | null | undefined,
  subject_code: string | null | undefined
): Promise<void> {
  if (!subject_description?.trim() || !subject_code?.trim()) return;

  const desc = subject_description.trim();
  const code = subject_code.trim();

  // Find existing questions with matching description but different code
  const { data: existing, error: fetchError } = await supabase
    .from('questions')
    .select('id, subject_code')
    .eq('subject_description', desc)
    .neq('subject_code', code)
    .limit(100);

  if (fetchError) {
    console.warn('Subject deduplication check failed:', fetchError);
    return;
  }

  if (!existing || existing.length === 0) return;

  // Update all mismatched records to the correct subject_code
  const { error: updateError } = await supabase
    .from('questions')
    .update({ subject_code: code })
    .eq('subject_description', desc)
    .neq('subject_code', code);

  if (updateError) {
    console.warn('Subject deduplication update failed:', updateError);
  } else {
    console.log(`Subject deduplication: updated ${existing.length} records from mismatched codes to "${code}" for "${desc}"`);
  }
}

/**
 * Batch deduplication for multiple questions (e.g., bulk import).
 * Collects unique description→code pairs and deduplicates each.
 */
export async function batchDeduplicateSubjectCodes(
  questions: Array<{ subject_description?: string | null; subject_code?: string | null }>
): Promise<void> {
  const seen = new Map<string, string>();

  for (const q of questions) {
    if (q.subject_description?.trim() && q.subject_code?.trim()) {
      seen.set(q.subject_description.trim(), q.subject_code.trim());
    }
  }

  await Promise.all(
    Array.from(seen.entries()).map(([desc, code]) =>
      deduplicateSubjectCode(desc, code)
    )
  );
}
