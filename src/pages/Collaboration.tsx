import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CollaborationHub } from '@/components/collaboration/CollaborationHub';
import { Users, FileQuestion, FileText, ClipboardCheck, ListChecks } from 'lucide-react';

export default function Collaboration() {
  const [selectedDocType, setSelectedDocType] = useState<'question' | 'test' | 'tos'>('question');
  const [documentId, setDocumentId] = useState('shared-workspace');

  const documentTypes = [
    { value: 'question', label: 'Question Bank', icon: FileQuestion },
    { value: 'test', label: 'Test Generation', icon: FileText },
    { value: 'tos', label: 'Table of Specifications', icon: ClipboardCheck }
  ];

  return (
    <div className="animate-slide-up space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Collaborative Workspace
          </h1>
          <p className="text-muted-foreground mt-2">
            Work together with other teachers in real-time
          </p>
        </div>
      </div>

      {/* Document Type Selector */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Label htmlFor="doc-type">Select Workspace Type</Label>
            <Select value={selectedDocType} onValueChange={(v: any) => setSelectedDocType(v)}>
              <SelectTrigger id="doc-type" className="w-full md:w-[400px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Collaboration Hub */}
      <CollaborationHub
        documentId={documentId}
        documentType={selectedDocType}
        title={documentTypes.find(t => t.value === selectedDocType)?.label}
      />

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-3">How Collaboration Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2 text-primary">Real-Time Features</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• See who's online and working</li>
                <li>• Track live changes as they happen</li>
                <li>• Instant synchronization across all users</li>
                <li>• Conflict resolution for simultaneous edits</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-primary">Communication</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Activity feed for all document changes</li>
                <li>• User presence indicators</li>
                <li>• Document version tracking</li>
                <li>• Change notifications and alerts</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
