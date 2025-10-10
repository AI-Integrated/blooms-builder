import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileDown, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateTestDocumentation } from "@/services/export/documentationGenerator";
import { buildComprehensiveReport } from "@/services/export/reportBuilder";

interface ReportGeneratorProps {
  testData: any;
  tosData?: any;
  psychometricData?: any;
  complianceData?: any;
  onComplete?: (reportUrl: string) => void;
}

export function ReportGenerator({ 
  testData, 
  tosData,
  psychometricData,
  complianceData,
  onComplete 
}: ReportGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  const handleGenerate = async (format: 'pdf' | 'docx') => {
    setGenerating(true);
    setProgress(0);
    setCurrentStep("Preparing report data...");

    try {
      // Step 1: Generate documentation
      setProgress(20);
      setCurrentStep("Generating documentation...");
      const documentation = await generateTestDocumentation(
        testData.id,
        testData,
        tosData,
        psychometricData
      );

      // Step 2: Build report
      setProgress(50);
      setCurrentStep("Building report...");
      
      // Extract questions from test data
      const questions = testData.items || [];
      
      const report = await buildComprehensiveReport(
        testData,
        questions,
        documentation,
        complianceData,
        psychometricData
      );

      // Step 3: Upload to storage (simulated)
      setProgress(80);
      setCurrentStep("Uploading report...");
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUrl = `https://storage.example.com/reports/${testData.id}.${format}`;
      setReportUrl(mockUrl);
      
      setProgress(100);
      setCurrentStep("Complete!");
      
      toast.success(`${format.toUpperCase()} report generated successfully`);
      onComplete?.(mockUrl);
      
    } catch (error: any) {
      toast.error(`Failed to generate report: ${error.message}`);
    } finally {
      setTimeout(() => {
        setGenerating(false);
        setProgress(0);
        setCurrentStep("");
      }, 1500);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Professional Report Generator</CardTitle>
        <CardDescription>
          Generate comprehensive test documentation and assessment reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Sections Preview */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Report Includes:</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>Test Overview</span>
            </div>
            {tosData && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>TOS Matrix</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>Question Bank</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>Answer Key</span>
            </div>
            {psychometricData && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Psychometric Analysis</span>
              </div>
            )}
            {complianceData && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Standards Compliance</span>
              </div>
            )}
          </div>
        </div>

        {/* Generation Progress */}
        {generating && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{currentStep}</p>
                <Progress value={progress} />
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success State */}
        {reportUrl && !generating && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Report generated successfully!</p>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <a href={reportUrl} download>
                    Download Report
                  </a>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Generation Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleGenerate('pdf')}
            disabled={generating}
            className="flex-1"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
          <Button
            onClick={() => handleGenerate('docx')}
            disabled={generating}
            variant="outline"
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate DOCX
          </Button>
        </div>

        {/* Additional Options */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Report will include all selected components</p>
          <p>• PDF format recommended for formal documentation</p>
          <p>• DOCX format allows further editing</p>
        </div>
      </CardContent>
    </Card>
  );
}
