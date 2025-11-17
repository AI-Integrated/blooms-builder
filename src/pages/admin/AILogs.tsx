import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function AILogs() {
  // Mock data - replace with real AI generation logs
  const logs = [
    {
      id: 1,
      timestamp: '2024-01-15 14:32',
      action: 'Question Generation',
      status: 'success',
      details: 'Generated 15 questions for Topic: Algebra',
      confidence: 0.92,
    },
    {
      id: 2,
      timestamp: '2024-01-15 14:28',
      action: 'Classification',
      status: 'success',
      details: "Classified question as Bloom's: Analyzing",
      confidence: 0.88,
    },
    {
      id: 3,
      timestamp: '2024-01-15 14:15',
      action: 'Redundancy Check',
      status: 'warning',
      details: 'Found 2 similar questions in bank',
      confidence: 0.76,
    },
    {
      id: 4,
      timestamp: '2024-01-15 14:10',
      action: 'Question Generation',
      status: 'error',
      details: 'Failed to generate questions - API timeout',
      confidence: null,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Activity Logs</h1>
          <p className="text-muted-foreground">
            Monitor AI question generation, classification, and validation activities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,247</div>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">94.2%</div>
              <p className="text-xs text-muted-foreground mt-1">Operations completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0.87</div>
              <p className="text-xs text-muted-foreground mt-1">AI confidence score</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">12</div>
              <p className="text-xs text-muted-foreground mt-1">Questions awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest AI operations and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex gap-4 flex-1">
                    <div className="mt-1">{getStatusIcon(log.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{log.action}</h4>
                        <Badge variant={getStatusVariant(log.status)} className="capitalize">
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{log.details}</p>
                      <p className="text-xs text-muted-foreground mt-1">{log.timestamp}</p>
                    </div>
                  </div>
                  {log.confidence !== null && (
                    <div className="text-right ml-4">
                      <div className="text-sm font-medium">
                        {(log.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">confidence</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
