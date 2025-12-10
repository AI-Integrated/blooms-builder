import { supabase } from "@/integrations/supabase/client";

// Types for sufficiency analysis
export interface SufficiencyResult {
  topic: string;
  bloomLevel: string;
  required: number;
  available: number;
  gap: number;
  sufficiency: 'pass' | 'warning' | 'fail';
}

export interface SufficiencyAnalysis {
  overallStatus: 'pass' | 'warning' | 'fail';
  overallScore: number;
  totalRequired: number;
  totalAvailable: number;
  results: SufficiencyResult[];
  recommendations: string[];
}

// Normalize strings for consistent matching
function normalize(text: string = "") {
  return text
    .toLowerCase()
    .replace(/[_\-]/g, " ")          // replace snake_case and hyphens
    .replace(/\s+/g, " ")           // collapse extra spaces
    .trim();
}

// Fuzzy topic matching:
// Matches:
//  - "requirements" ≈ "requirements engineering"
//  - "req eng" ≈ "requirements engineering"
//  - "requirements_engineering" ≈ "requirements engineering"
function topicsMatch(t1: string, t2: string) {
  return (
    t1.includes(t2) ||
    t2.includes(t1)
  );
}

export async function analyzeTOSSufficiency(tosMatrix: any) {
  // 1. Fetch all NON-DELETED questions once (FAST)
  const { data: rawQuestions, error } = await supabase
    .from("questions")
    .select("id, topic, bloom_level, deleted");

  if (error) {
    console.error("Error fetching questions:", error);
    throw new Error("Unable to analyze question bank.");
  }

  // Normalize all question fields
  const questions = rawQuestions
    .filter(q => !q.deleted)
    .map(q => ({
      ...q,
      topic: normalize(q.topic),
      bloom: normalize(q.bloom_level)
    }));

  const results = [];
  let totalRequired = 0;
  let totalAvailable = 0;

  const bloomLevels = [
    "remembering",
    "understanding",
    "applying",
    "analyzing",
    "evaluating",
    "creating"
  ].map(normalize);

  // 2. Analyze EACH topic and bloom requirement from TOS
  for (const topic of tosMatrix.topics || []) {
    const topicName = normalize(topic.topic_name || topic.topic);

    for (const bloom of bloomLevels) {
      const required = topic[`${bloom}_items`] || 0;
      if (required === 0) continue;

      totalRequired += required;

      // 3. Get ONLY questions matching topic + bloom
      const matched = questions.filter(q =>
        topicsMatch(q.topic, topicName) &&
        q.bloom === bloom
      );

      const available = matched.length;
      totalAvailable += available;

      const gap = Math.max(0, required - available);

      results.push({
        topic: topicName,
        bloomLevel: bloom,
        required,
        available,    // <-- This is now used instead of approved
        gap,
        sufficiency:
          available >= required
            ? "pass"
            : available >= required * 0.7
            ? "warning"
            : "fail"
      });
    }
  }

  // 4. Determine overall result
  const overallScore =
    totalRequired > 0
      ? (totalAvailable / totalRequired) * 100
      : 0;

  const overallStatus =
    overallScore >= 100
      ? "pass"
      : overallScore >= 70
      ? "warning"
      : "fail";

  // 5. Recommendations for AI generation
  const missing = results.filter(r => r.gap > 0);

  const recommendations =
    missing.length > 0
      ? [
          `AI will generate ${missing.reduce((n, r) => n + r.gap, 0)} questions to fill the gaps.`,
          ...missing.map(r =>
            `• ${r.topic} (${r.bloomLevel}) requires ${r.required}, but only ${r.available} exist.`
          )
        ]
      : ["All required questions exist in the bank."];

  return {
    overallStatus,
    overallScore,
    totalRequired,
    totalAvailable,
    results,
    recommendations
  };
}
