import { supabase } from "@/integrations/supabase/client";

export default function DebugPage() {
  async function testFetch() {
    const { data, error } = await supabase
      .from("questions")
      .select("*");

    console.log("FETCHED QUESTIONS:", data, error);
  }

  return (
    <div>
      <button 
        onClick={testFetch}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Run Question Fetch Test
      </button>
    </div>
  );
}
