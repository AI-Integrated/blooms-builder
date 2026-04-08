import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ParsedTOSData {
  subject_no: string;
  course: string;
  description: string;
  year_section: string;
  exam_period: string;
  school_year: string;
  total_items: number;
  prepared_by: string;
  checked_by: string;
  noted_by: string;
  topics: Array<{ topic: string; hours: number }>;
}

interface TOSUploadParserProps {
  onParsed: (data: ParsedTOSData) => void;
}

export function TOSUploadParser({ onParsed }: TOSUploadParserProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx") && !name.endsWith(".doc")) {
      toast.error("Unsupported file format", {
        description: "Please upload a PDF or DOCX file.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Maximum file size is 10MB.",
      });
      return;
    }

    setFileName(file.name);
    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://lohmzywgbkntvpuygvfx.supabase.co/functions/v1/parse-tos-document`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token || ""}`,
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaG16eXdnYmtudHZwdXlndmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjYyNDUsImV4cCI6MjA2ODAwMjI0NX0.FCiA9ps4QYto38P0-sZcNcR3YtOJba9GV3PGeMwKuds",
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const parsed: ParsedTOSData = await response.json();

      // Count how many fields were extracted
      const filledFields = [
        parsed.subject_no, parsed.course, parsed.description,
        parsed.year_section, parsed.exam_period, parsed.school_year,
        parsed.prepared_by, parsed.noted_by,
      ].filter(f => f && f.length > 0).length;

      onParsed(parsed);

      toast.success("TOS Document Parsed", {
        description: `Extracted ${filledFields} fields and ${parsed.topics.length} topic(s) from "${file.name}".`,
      });
    } catch (error) {
      console.error("TOS parse error:", error);
      toast.error("Failed to parse document", {
        description: error instanceof Error ? error.message : "Please try again or fill in manually.",
      });
    } finally {
      setIsParsing(false);
      // Reset file input so same file can be re-uploaded
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        onChange={handleFileSelect}
        className="hidden"
        id="tos-upload"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isParsing}
        className="gap-2"
      >
        {isParsing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Parsing {fileName ? `"${fileName}"` : "..."}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload Existing TOS
          </>
        )}
      </Button>
      {!isParsing && (
        <span className="text-xs text-muted-foreground">PDF or DOCX</span>
      )}
    </div>
  );
}
