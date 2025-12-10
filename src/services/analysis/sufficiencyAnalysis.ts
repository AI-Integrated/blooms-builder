import { supabase } from "@/integrations/supabase/client";

export interface SufficiencyResult {
  topic: string;
  bloomLevel: string;
  required: number;
  available: number;
  gap: number;
  sufficiency: "pass" | "warning" | "fail";
}

export interface SufficiencyAnalysis {
  overallStatus: "pass" | "warning" | "fail";
  overallScore: number;
  totalRequired: number;
  totalAvailable: number;
  results: SufficiencyResult[];
  recommendations: string[];
}

export async function analyzeTOSSufficiency(tosMatrix: any): Promise<SufficiencyAnalysis> {
  const { data: allQuestionsRaw, error } = await supabase
    .from("questions")
    .select("id, topic, bloom_level, deleted");

  if (error) {
    console.error("Failed to fetch questions:", error);
    throw new Error("Failed to analyze question bank sufficiency");
  }

  console.log("Raw questions from DB:", allQuestionsRaw?.length, "questions");

  const allQuestions = (allQuestionsRaw || [])
    .filter(q => !q.deleted)
    .map(q => ({
      ...q,
      topic: (q.topic || "").toLowerCase().trim(),
      bloom: (q.bloom_level || "").toLowerCase().trim(),
    }));

  console.log("Filtered questions (not deleted):", allQuestions.length);
  console.log("Sample questions:", allQuestions.slice(0, 3));
  console.log("TOS topics:", tosMatrix.topics);

  const results: SufficiencyResult[] = [];
  let totalRequired = 0;
  let totalAvailable = 0;

  const bloomLevels = [
    "remembering",
    "understanding",
    "applying",
    "analyzing",
    "evaluating",
    "creating"
  ];

  for (const topic of tosMatrix.topics || []) {
    const topicName = (topic.topic_name || topic.topic || "").toLowerCase().trim();
    console.log("Checking TOS topic:", topicName);

    for (const bloom of bloomLevels) {
      const required = topic[`${bloom}_items`] || 0;
      if (required === 0) continue;

      totalRequired += required;

      // More flexible matching: check if either contains the other, or fuzzy match
      const matched = allQuestions.filter(q => {
        const dbTopic = q.topic;
        const tosTopicNorm = topicName;
        
        // Check various matching strategies
        const exactMatch = dbTopic === tosTopicNorm;
        const dbContainsTos = dbTopic.includes(tosTopicNorm);
        const tosContainsDb = tosTopicNorm.includes(dbTopic);
        
        const topicMatches = exactMatch || dbContainsTos || tosContainsDb;
        const bloomMatches = q.bloom === bloom;
        
        return topicMatches && bloomMatches;
      });

      console.log(`Topic "${topicName}" + Bloom "${bloom}": found ${matched.length} questions (required: ${required})`);

      const available = matched.length;
      totalAvailable += available;

      const gap = Math.max(0, required - available);

      results.push({
        topic: topicName,
        bloomLevel: bloom,
        required,
        available,
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

  console.log("Total required:", totalRequired, "Total available:", totalAvailable);

  const overallScore =
    totalRequired > 0 ? (totalAvailable / totalRequired) * 100 : 0;

  const overallStatus =
    overallScore >= 100
      ? "pass"
      : overallScore >= 70
      ? "warning"
      : "fail";

  const missing = results.filter(r => r.gap > 0);

  const recommendations =
    missing.length > 0
      ? [`AI will generate ${missing.reduce((sum, r) => sum + r.gap, 0)} additional questions.`]
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
