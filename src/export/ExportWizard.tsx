import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Printer, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import { ProfessionalTemplates, type TestMetadata, type ExportOptions } from '@/services/export/professionalTemplates';

interface ExportWizardProps {
  questions: any[];
  metadata: TestMetadata;
  onExport?: (result: { format: string; blob: Blob }) => void;
}

export function ExportWizard({ questions, metadata, onExport }: ExportWizardProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    template: 'academic',
    includeHeader: true,
    includeFooter: true,
    includeAnswerKey: false,
    includeRubrics: false,
    includeStatistics: false,
    pageNumbers: true
  });
  const [watermark, setWatermark] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async (format: 'pdf' | 'latex' | 'docx') => {
    setIsExporting(true);
    
    try {
      let result: Blob | string;
      
      if (format === 'pdf') {
        result = await ProfessionalTemplates.generatePDF(
          questions,
          metadata,
          { ...exportOptions, watermark: watermark || undefined }
        );
        
        // Download PDF
        const url = URL.createObjectURL(result);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${metadata.title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success('PDF exported successfully!');
      } else if (format === 'latex') {
        result = ProfessionalTemplates.generateLaTeX(questions, metadata);
        
        // Download LaTeX file
        const blob = new Blob([result], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${metadata.title.replace(/\s+/g, '_')}.tex`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success('LaTeX file exported successfully!');
      }
      
      if (onExport && result instanceof Blob) {
        onExport({ format, blob: result });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export document');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Professional Export
        </CardTitle>
        <CardDescription>
          Export your test in multiple professional formats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="format">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="format">Format & Template</TabsTrigger>
            <TabsTrigger value="options">Export Options</TabsTrigger>
          </TabsList>
          
          <TabsContent value="format" className="space-y-4">
            <div>
              <Label>Template Style</Label>
              <Select
                value={exportOptions.template}
                onValueChange={(value: any) => setExportOptions({ ...exportOptions, template: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Academic - Traditional school format
                    </div>
                  </SelectItem>
                  <SelectItem value="corporate">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Corporate - Professional business style
                    </div>
                  </SelectItem>
                  <SelectItem value="standardized">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Standardized - Bubble sheet compatible
                    </div>
                  </SelectItem>
                  <SelectItem value="minimal">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Minimal - Clean and simple
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="h-auto py-4 flex-col gap-2"
              >
                <FileText className="h-6 w-6" />
                <span>PDF</span>
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExport('latex')}
                disabled={isExporting}
                className="h-auto py-4 flex-col gap-2"
              >
                <FileCode className="h-6 w-6" />
                <span>LaTeX</span>
                <Badge variant="secondary" className="text-xs">Academic</Badge>
              </Button>
              
              <Button
                variant="outline"
                disabled
                className="h-auto py-4 flex-col gap-2"
              >
                <Printer className="h-6 w-6" />
                <span>Print</span>
                <Badge variant="secondary" className="text-xs">Direct</Badge>
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="options" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Include Header</Label>
                <Switch
                  checked={exportOptions.includeHeader}
                  onCheckedChange={(checked) => 
                    setExportOptions({ ...exportOptions, includeHeader: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Include Footer</Label>
                <Switch
                  checked={exportOptions.includeFooter}
                  onCheckedChange={(checked) => 
                    setExportOptions({ ...exportOptions, includeFooter: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Page Numbers</Label>
                <Switch
                  checked={exportOptions.pageNumbers}
                  onCheckedChange={(checked) => 
                    setExportOptions({ ...exportOptions, pageNumbers: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Include Answer Key</Label>
                <Switch
                  checked={exportOptions.includeAnswerKey}
                  onCheckedChange={(checked) => 
                    setExportOptions({ ...exportOptions, includeAnswerKey: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Include Statistics</Label>
                <Switch
                  checked={exportOptions.includeStatistics}
                  onCheckedChange={(checked) => 
                    setExportOptions({ ...exportOptions, includeStatistics: checked })
                  }
                />
              </div>
              
              <div>
                <Label>Watermark (optional)</Label>
                <Input
                  placeholder="e.g., CONFIDENTIAL"
                  value={watermark}
                  onChange={(e) => setWatermark(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Document Preview</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Title: <strong>{metadata.title}</strong></div>
            <div>Questions: <strong>{questions.length}</strong></div>
            <div>Template: <strong className="capitalize">{exportOptions.template}</strong></div>
            <div>Format: <strong>PDF / LaTeX</strong></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
