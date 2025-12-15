import { supabase } from "@/integrations/supabase/client";

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

export async function analyzeTOSSufficiency(tosMatrix: any) {

  // 1️⃣ Fetch all usable questions ONCE
  const { data, error } = await supabase
    .from("questions")
    .select("id, topic, deleted")
    .eq("approved", true)
    .eq("deleted", false);

  if (error) {
    console.error(error);
    throw new Error("Failed to analyze question bank sufficiency");
  }

  // 2️⃣ Normalize & group questions by topic
  const topicMap: Record<string, number> = {};

  data.forEach(q => {
    const key = normalize(q.topic || "");
    topicMap[key] = (topicMap[key] || 0) + 1;
  });

  const results = [];
  let totalRequired = 0;
  let totalAvailable = 0;

  // 3️⃣ Analyze per TOS topic
  for (const topic of tosMatrix.topics || []) {
    const topicName = normalize(topic.topic_name || topic.topic);

    const required =
      (topic.remembering_items || 0) +
      (topic.understanding_items || 0) +
      (topic.applying_items || 0) +
      (topic.analyzing_items || 0) +
      (topic.evaluating_items || 0) +
      (topic.creating_items || 0);

    const available = topicMap[topicName] || 0;

    totalRequired += required;
    totalAvailable += available;

    const gap = Math.max(0, required - available);

    results.push({
      topic: topicName,
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

  // 4️⃣ Overall evaluation
  const overallScore =
    totalRequired > 0 ? (totalAvailable / totalRequired) * 100 : 0;

  const overallStatus =
    overallScore >= 100
      ? "pass"
      : overallScore >= 70
      ? "warning"
      : "fail";

  const recommendations =
    overallStatus === "pass"
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
