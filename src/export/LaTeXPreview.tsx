import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

interface LaTeXPreviewProps {
  latexCode: string;
  onDownload?: () => void;
}

export function LaTeXPreview({ latexCode, onDownload }: LaTeXPreviewProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(latexCode);
      toast.success("LaTeX code copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy LaTeX code");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>LaTeX Preview</CardTitle>
            <CardDescription>
              Generated LaTeX code for your test
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download .tex
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] w-full">
          <pre className="p-4 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
            <code>{latexCode}</code>
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
