import { supabase } from "@/integrations/supabase/client";

// Type definitions
export interface TopicResult {
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
  results: TopicResult[];
  recommendations: string[];
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

const normalizeBloom = (bloom: string) => {
  const b = bloom.toLowerCase().trim();
  // Map various formats to standard names
  if (b.includes("remember")) return "remembering";
  if (b.includes("understand")) return "understanding";
  if (b.includes("apply")) return "applying";
  if (b.includes("analy")) return "analyzing";
  if (b.includes("evaluat")) return "evaluating";
  if (b.includes("creat")) return "creating";
  return b;
};

export async function analyzeTOSSufficiency(tosMatrix: any): Promise<SufficiencyAnalysis> {
  // Fetch all non-deleted questions with topic and bloom_level
  const { data: questions, error } = await supabase
    .from("questions")
    .select("id, topic, bloom_level, approved")
    .eq("deleted", false);

  if (error) {
    console.error("Error fetching questions:", error);
    throw new Error("Failed to analyze question bank sufficiency");
  }

  // Group questions by normalized topic + bloom level
  const questionMap: Record<string, Record<string, { total: number; approved: number }>> = {};

  (questions || []).forEach((q) => {
    const topicKey = normalize(q.topic || "");
    const bloomKey = normalizeBloom(q.bloom_level || "");
    
    if (!topicKey || !bloomKey) return;

    if (!questionMap[topicKey]) {
      questionMap[topicKey] = {};
    }
    if (!questionMap[topicKey][bloomKey]) {
      questionMap[topicKey][bloomKey] = { total: 0, approved: 0 };
    }
    
    questionMap[topicKey][bloomKey].total += 1;
    if (q.approved) {
      questionMap[topicKey][bloomKey].approved += 1;
    }
  });

  const results: TopicResult[] = [];
  let totalRequired = 0;
  let totalAvailable = 0;

  const bloomLevels = ["remembering", "understanding", "applying", "analyzing", "evaluating", "creating"];

  // Process each topic in the TOS matrix
  for (const topic of tosMatrix.topics || []) {
    const topicName = topic.topic_name || topic.topic || topic.name;
    if (!topicName) continue;

    const normalizedTopic = normalize(topicName);
    const matrixEntry = tosMatrix.matrix?.[topicName];

    for (const bloom of bloomLevels) {
      // Get required count from TOS matrix
      let required = 0;

// 1️⃣ Legacy / most reliable (what your UI actually saves)
if (topic[`${bloom}_items`] != null) {
  required = Number(topic[`${bloom}_items`]) || 0;
}

// 2️⃣ Matrix format (optional override)
else if (matrixEntry?.[bloom]?.count != null) {
  required = Number(matrixEntry[bloom].count) || 0;
}

// 3️⃣ Distribution format (fallback)
else if (Array.isArray(tosMatrix.distribution?.[topicName]?.[bloom])) {
  required = tosMatrix.distribution[topicName][bloom].length;
}

      if (required === 0) continue; // Skip if no items required for this bloom level

      // Find available questions - use fuzzy matching for topics
      let available = 0;
      
      // Exact match first
      if (questionMap[normalizedTopic]?.[bloom]) {
        available = questionMap[normalizedTopic][bloom].total;
      } else {
        // Fuzzy match: check if any topic contains our normalized topic name
        for (const [dbTopic, bloomData] of Object.entries(questionMap)) {
          if (dbTopic.includes(normalizedTopic) || normalizedTopic.includes(dbTopic)) {
            available += bloomData[bloom]?.total || 0;
          }
        }
      }

      totalRequired += required;
      totalAvailable += Math.min(available, required);

      const gap = Math.max(0, required - available);

      let sufficiency: "pass" | "warning" | "fail";
      if (required === 0) {
        sufficiency = "pass";
      } else if (available >= required) {
        sufficiency = "pass";
      } else if (available >= required * 0.7) {
        sufficiency = "warning";
      } else {
        sufficiency = "fail";
      }


      results.push({
        topic: topicName,
        bloomLevel: bloom.charAt(0).toUpperCase() + bloom.slice(1),
        required,
        available,
        gap,
        sufficiency,
      });
    }
  }

  // Calculate overall score and status
  const totalGap = results.reduce((sum, r) => sum + r.gap, 0);
  const overallScore = totalRequired === 0 ? 100 : Math.min(100, (totalAvailable / totalRequired) * 100);

let overallStatus: "pass" | "warning" | "fail";
if (totalRequired === 0) {
  overallStatus = "pass";
} else if (totalGap === 0) {
  overallStatus = "pass";
} else if (overallScore >= 70) {
  overallStatus = "warning";
} else {
  overallStatus = "fail";
}


  // Generate recommendations
  const recommendations: string[] = [];

  if (totalRequired === 0) {
    recommendations.push("Define TOS requirements to compute question gaps.");
  } else if (overallStatus === "pass") {
    recommendations.push("✓ Question bank has sufficient coverage for all topics and bloom levels.");
  } else {
    if (totalGap > 0) {
      recommendations.push(`AI will generate ${totalGap} additional question(s) to complete the exam.`);
    }
  }


  return {
    overallStatus,
    overallScore,
    totalRequired,
    totalAvailable,
    results,
    recommendations,
  };
}
