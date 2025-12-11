import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function TestQuery() {
  useEffect(() => {
    async function run() {
      const { data, error } = await supabase
        .from("questions")
        .select("*");

      console.log("FETCHED QUESTIONS:", data, error);
    }
    run();
  }, []);

  return <div>Check console logs.</div>;
}
