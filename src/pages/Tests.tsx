
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Plus } from "lucide-react";

const Tests = () => {
  return (
    <div className="animate-slide-up space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Test Generator</h2>
          <p className="text-muted-foreground">
            Create and manage your assessment tests.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Generate Test
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex items-start space-x-4 p-6">
            <FileText className="h-10 w-10 flex-shrink-0 text-primary" />
            <div className="space-y-1">
              <CardTitle>Mathematics Assessment #{i + 1}</CardTitle>
              <CardDescription>
                Created on {new Date().toLocaleDateString()}
              </CardDescription>
              <div className="text-sm text-muted-foreground">
                25 questions • 60 minutes
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Tests;
