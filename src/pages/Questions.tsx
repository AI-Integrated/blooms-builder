
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";

const Questions = () => {
  return (
    <div className="animate-slide-up space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Question Bank</h2>
          <p className="text-muted-foreground">
            Manage and organize your assessment questions.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-sm">Mathematics</CardTitle>
              <CardDescription>Algebra - Linear Equations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Solve for x: If 2x + 5 = 13, what is the value of x?
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Questions;
