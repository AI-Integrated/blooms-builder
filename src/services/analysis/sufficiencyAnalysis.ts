import { supabase } from "@/integrations/supabase/client";

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

export async function analyzeTOSSufficiency(tosMatrix: any) {

  const { data, error } = await supabase
    .from("questions")
    .select("id, topic, deleted")
    .eq("deleted", false);

  if (error) {
    console.error(error);
    throw new Error("Failed to analyze question bank sufficiency");
  }

  // Group questions by normalized topic
  const topicMap: Record<string, number> = {};

  data.forEach(q => {
    const key = normalize(q.topic || "");
    topicMap[key] = (topicMap[key] || 0) + 1;
  });

  const results = [];
  let totalRequired = 0;
  let totalAvailable = 0;

  for (const topic of tosMatrix.topics || []) {
    const topicName = normalize(topic.topic_name || topic.topic);

    const required =
      (topic.remembering_items || 0) +
      (topic.understanding_items || 0) +
      (topic.applying_items || 0) +
      (topic.analyzing_items || 0) +
      (topic.evaluating_items || 0) +
      (topic.creating_items || 0);

    const available = Object.entries(topicMap)
      .filter(([dbTopic]) => dbTopic.includes(topicName))
      .reduce((sum, [, count]) => sum + count, 0);

    totalRequired += required;
    totalAvailable += available;

    const gap = Math.max(0, required - available);

    results.push({
      topic: topicName,
      required,
      available,
      gap,
      sufficiency:
        required === 0
          ? "pass"
          : available >= required
          ? "pass"
          : available >= required * 0.7
          ? "warning"
          : "fail"
    });
  }

  const overallScore =
    totalRequired === 0 ? 100 : (totalAvailable / totalRequired) * 100;

  let overallStatus: "pass" | "warning" | "fail";
  if (totalRequired === 0) overallStatus = "pass";
  else if (overallScore >= 100) overallStatus = "pass";
  else if (overallScore >= 70) overallStatus = "warning";
  else overallStatus = "fail";

  const recommendations =
    totalRequired === 0
      ? ["Question availability analyzed. Define TOS requirements to compute gaps."]
      : overallStatus === "pass"
      ? ["All required questions exist in the bank."]
      : [
          `AI will generate ${totalRequired - totalAvailable} additional questions to complete the exam.`
        ];

  return {
    overallStatus,
    overallScore,
    totalRequired,
    totalAvailable,
    results,
    recommendations
  };
}
