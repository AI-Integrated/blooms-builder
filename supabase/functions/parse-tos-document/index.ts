import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".pdf") && !fileName.endsWith(".docx") && !fileName.endsWith(".doc")) {
      return new Response(JSON.stringify({ error: "Only PDF and DOCX files are supported" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read file content as text for AI processing
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 for AI processing
    let base64Content = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64Content += String.fromCharCode(...chunk);
    }
    base64Content = btoa(base64Content);

    // For text extraction, try to get raw text from PDF
    let extractedText = "";
    
    // Use a simple text extraction approach - send to AI with instructions
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a document parser that extracts Table of Specifications (TOS) data from academic documents. 

Extract the following fields from the document. Return ONLY valid JSON with this exact structure:
{
  "subject_no": "string - the subject number/code (e.g., IS 9, ITCC 100)",
  "course": "string - the course/program (e.g., BSIS, BSIT)",
  "description": "string - subject description (e.g., System Analysis and Design)",
  "year_section": "string - year and section (e.g., BSIS-3A, 3rd Year Section A)",
  "exam_period": "string - examination period (e.g., Final Examination, Midterm)",
  "school_year": "string - school year (e.g., 2024-2025)",
  "total_items": number,
  "prepared_by": "string - name of preparer",
  "checked_by": "string - name of checker/reviewer",
  "noted_by": "string - name of noter (usually dean)",
  "topics": [
    {
      "topic": "string - topic/learning competency name",
      "hours": number
    }
  ]
}

Rules:
- Extract all topics/learning competencies with their instructional hours
- If total_items is not explicitly stated, calculate from the matrix totals
- If hours are not specified, estimate based on percentage distribution
- If a field is not found, use an empty string for text fields or 0 for numbers
- Always return valid JSON, no markdown formatting`;

    // For PDFs, use vision model with base64
    const isPDF = fileName.endsWith(".pdf");
    
    let messages: any[];
    if (isPDF) {
      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the TOS data from this document. Return only the JSON object.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${base64Content}`,
              },
            },
          ],
        },
      ];
    } else {
      // For DOCX, send as text content
      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Extract the TOS data from this document content (base64 encoded ${fileName}). The file is a DOCX document. Parse the content and return only the JSON object.\n\nBase64 content: ${base64Content.substring(0, 50000)}`,
        },
      ];
    }

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      return new Response(JSON.stringify({ error: "AI parsing failed. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "No response from AI parser" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedTOS;
    try {
      parsedTOS = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize and validate
    const result = {
      subject_no: String(parsedTOS.subject_no || "").trim(),
      course: String(parsedTOS.course || "").trim(),
      description: String(parsedTOS.description || "").trim(),
      year_section: String(parsedTOS.year_section || "").trim(),
      exam_period: String(parsedTOS.exam_period || "").trim(),
      school_year: String(parsedTOS.school_year || "").trim(),
      total_items: Number(parsedTOS.total_items) || 50,
      prepared_by: String(parsedTOS.prepared_by || "").trim(),
      checked_by: String(parsedTOS.checked_by || "").trim(),
      noted_by: String(parsedTOS.noted_by || "").trim(),
      topics: Array.isArray(parsedTOS.topics)
        ? parsedTOS.topics.map((t: any) => ({
            topic: String(t.topic || t.name || "").trim(),
            hours: Number(t.hours) || 3,
          })).filter((t: any) => t.topic.length > 0)
        : [],
    };

    // Ensure at least one topic
    if (result.topics.length === 0) {
      result.topics = [{ topic: "General", hours: 3 }];
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Parse TOS error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to parse document" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
