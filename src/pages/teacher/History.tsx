import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, FileText, Download, Eye } from 'lucide-react';

export default function History() {
  // Mock data - replace with real data from database
  const testHistory = [
    { id: 1, title: 'Midterm Exam', date: '2024-01-15', questions: 50, students: 45, status: 'completed' },
    { id: 2, title: 'Quiz 3', date: '2024-01-10', questions: 20, students: 43, status: 'completed' },
    { id: 3, title: 'Final Practice', date: '2024-01-05', questions: 75, students: 42, status: 'completed' },
  ];

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Test History</h1>
          <p className="text-muted-foreground">
            View and manage all previously generated tests
          </p>
        </div>

        <div className="space-y-4">
          {testHistory.map((test) => (
            <Card key={test.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {test.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      {new Date(test.date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {test.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span>{test.questions} questions</span>
                    <span>{test.students} students</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
  );
}
