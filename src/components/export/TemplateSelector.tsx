import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FileText, Layout, Palette } from "lucide-react";

export interface TemplateConfig {
  template: string;
  paperSize: string;
  includeHeader: boolean;
  includeFooter: boolean;
  includeTOS: boolean;
  includeAnswerKey: boolean;
  schoolLogo?: string;
  customHeader?: string;
}

interface TemplateSelectorProps {
  config: TemplateConfig;
  onConfigChange: (config: TemplateConfig) => void;
}

export function TemplateSelector({ config, onConfigChange }: TemplateSelectorProps) {
  const updateConfig = (updates: Partial<TemplateConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Template Style
          </CardTitle>
          <CardDescription>Choose a professional template</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={config.template}
            onValueChange={(value) => updateConfig({ template: value })}
          >
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="standard" id="standard" />
              <Label htmlFor="standard" className="flex-1 cursor-pointer">
                <div>
                  <p className="font-medium">Standard Academic</p>
                  <p className="text-sm text-muted-foreground">
                    Clean layout with header and footer
                  </p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="formal" id="formal" />
              <Label htmlFor="formal" className="flex-1 cursor-pointer">
                <div>
                  <p className="font-medium">Formal Assessment</p>
                  <p className="text-sm text-muted-foreground">
                    Professional format with institution branding
                  </p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="minimal" id="minimal" />
              <Label htmlFor="minimal" className="flex-1 cursor-pointer">
                <div>
                  <p className="font-medium">Minimal</p>
                  <p className="text-sm text-muted-foreground">
                    Simple layout focused on content
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Paper Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={config.paperSize}
            onValueChange={(value) => updateConfig({ paperSize: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="letter" id="letter" />
              <Label htmlFor="letter">Letter (8.5" × 11")</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="a4" id="a4" />
              <Label htmlFor="a4">A4 (210mm × 297mm)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="legal" id="legal" />
              <Label htmlFor="legal">Legal (8.5" × 14")</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Content Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="header">Include Header</Label>
            <Switch
              id="header"
              checked={config.includeHeader}
              onCheckedChange={(checked) => updateConfig({ includeHeader: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="footer">Include Footer</Label>
            <Switch
              id="footer"
              checked={config.includeFooter}
              onCheckedChange={(checked) => updateConfig({ includeFooter: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="tos">Include TOS Matrix</Label>
            <Switch
              id="tos"
              checked={config.includeTOS}
              onCheckedChange={(checked) => updateConfig({ includeTOS: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="answer-key">Include Answer Key</Label>
            <Switch
              id="answer-key"
              checked={config.includeAnswerKey}
              onCheckedChange={(checked) => updateConfig({ includeAnswerKey: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="logo">School Logo URL (optional)</Label>
            <Input
              id="logo"
              type="url"
              placeholder="https://example.com/logo.png"
              value={config.schoolLogo || ''}
              onChange={(e) => updateConfig({ schoolLogo: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="custom-header">Custom Header Text (optional)</Label>
            <Input
              id="custom-header"
              placeholder="e.g., Department of Education"
              value={config.customHeader || ''}
              onChange={(e) => updateConfig({ customHeader: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
