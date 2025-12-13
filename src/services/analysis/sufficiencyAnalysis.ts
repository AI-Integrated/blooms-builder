import { supabase } from "@/integrations/supabase/client";

// Normalize topics for flexible matching
function normalize(str: string = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ") // remove special chars
    .replace(/\s+/g, " ")        // collapse spaces
    .trim();
}

// Loose topic matching (supports partial matches)
function topicMatches(bankTopic: string, tosTopic: string) {
  return (
    bankTopic.includes(tosTopic) ||
    tosTopic.includes(bankTopic)
  );
}

export async function analyzeTOSSufficiency(tosMatrix: any) {
  // 1. Fetch ALL questions fast (one query only)
  const { data: allQuestionsRaw, error } = await supabase
    .from("questions")
    .select("id, topic, bloom_level, deleted");

  if (error) {
    console.error("❌ Failed to fetch questions:", error);
    throw new Error("Failed to analyze question bank sufficiency");
  }

  // 2. Normalize everything
  const allQuestions = allQuestionsRaw
    .filter(q => !q.deleted)
    .map(q => ({
      ...q,
      topic: normalize(q.topic),
      bloom: normalize(q.bloom_level),
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
  ];

  // 3. Analyze each topic in TOS
  for (const topic of tosMatrix.topics || []) {
    const topicName = normalize(topic.topic_name || topic.topic);

    for (const bloom of bloomLevels) {
      const required = topic[`${bloom}_items`] || 0;
      if (required === 0) continue;

      totalRequired += required;

      // 4. Match available questions in the bank
      const matches = allQuestions.filter(q =>
        q.bloom === bloom &&
        topicMatches(q.topic, topicName)
      );

      const available = matches.length;
      totalAvailable += available;

      const gap = Math.max(0, required - available);

      results.push({
        topic: topicName,
        bloomLevel: bloom,
        required,
        available,
        gap,
        sufficiency:
          available >= required ? "pass" :
          available >= required * 0.7 ? "warning" :
          "fail"
      });
    }
  }

  // 5. Overall status
  const overallScore =
    totalRequired > 0 ? (totalAvailable / totalRequired) * 100 : 0;

  const overallStatus =
    overallScore >= 100 ? "pass" :
    overallScore >= 70 ? "warning" :
    "fail";

  // 6. Recommend how many questions AI should generate
  const missing = results.filter(r => r.gap > 0);
  const totalToGenerate = missing.reduce((sum, r) => sum + r.gap, 0);

  const recommendations = [];

  if (totalToGenerate > 0) {
    recommendations.push(
      `AI will generate ${totalToGenerate} missing questions to meet TOS requirements.`
    );

    missing.forEach(m => {
      recommendations.push(
        ` • Topic "${m.topic}" – Bloom "${m.bloomLevel}" is missing ${m.gap} questions`
      );
    });
  } else {
    recommendations.push("All required questions exist in the bank.");
  }

  return {
    overallStatus,
    overallScore,
    totalRequired,
    totalAvailable,
    results,
    recommendations
  };
}
