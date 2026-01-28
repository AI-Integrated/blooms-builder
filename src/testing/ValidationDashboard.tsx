import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Play, 
  RefreshCw,
  Shield,
  Zap,
  Eye,
  Settings
} from 'lucide-react';
import { automatedValidator, ValidationSuite, ValidationTest } from '@/services/testing/automatedValidator';
import { useToast } from '@/hooks/use-toast';

interface ValidationDashboardProps {
  entityId?: string;
  entityType?: 'question' | 'test' | 'system';
}

const ValidationDashboard: React.FC<ValidationDashboardProps> = ({ 
  entityId = 'sample-entity', 
  entityType = 'system' 
}) => {
  const [currentSuite, setCurrentSuite] = useState<ValidationSuite | null>(null);
  const [validationHistory, setValidationHistory] = useState<ValidationSuite[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntityType, setSelectedEntityType] = useState<'question' | 'test' | 'system'>(entityType);
  const { toast } = useToast();

  useEffect(() => {
    loadValidationHistory();
  }, [entityId, entityType]);

  const loadValidationHistory = async () => {
    try {
      const history = await automatedValidator.getValidationHistory(entityId, entityType);
      setValidationHistory(history);
    } catch (error) {
      console.error('Error loading validation history:', error);
    }
  };

  const runValidation = async () => {
    try {
      setLoading(true);
      
      let suite: ValidationSuite;
      
      switch (selectedEntityType) {
        case 'question':
          suite = await automatedValidator.validateQuestion(entityId);
          break;
        case 'test':
          suite = await automatedValidator.validateTest(entityId);
          break;
        case 'system':
        default:
          suite = await automatedValidator.validateSystem();
          break;
      }
      
      setCurrentSuite(suite);
      await loadValidationHistory();
      
      toast({
        title: "Validation completed",
        description: `${suite.tests.length} tests executed in ${(suite.executionTime / 1000).toFixed(2)}s`,
      });
    } catch (error) {
      console.error('Error running validation:', error);
      toast({
        title: "Validation failed",
        description: "Failed to complete validation tests.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: 'secondary',
      medium: 'outline',
      high: 'destructive',
      critical: 'destructive'
    } as const;
    
    return <Badge variant={variants[severity as keyof typeof variants] || 'secondary'}>{severity}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      structural: <Settings className="h-4 w-4" />,
      content: <Eye className="h-4 w-4" />,
      performance: <Zap className="h-4 w-4" />,
      security: <Shield className="h-4 w-4" />,
      accessibility: <Eye className="h-4 w-4" />
    };
    
    return icons[type as keyof typeof icons] || <Settings className="h-4 w-4" />;
  };

  const summaryStats = currentSuite ? {
    total: currentSuite.tests.length,
    passed: currentSuite.tests.filter(t => t.passed).length,
    failed: currentSuite.tests.filter(t => !t.passed).length,
    critical: currentSuite.tests.filter(t => t.severity === 'critical' && !t.passed).length
  } : null;

  const testTypeBreakdown = currentSuite ? {
    structural: currentSuite.tests.filter(t => t.type === 'structural').length,
    content: currentSuite.tests.filter(t => t.type === 'content').length,
    performance: currentSuite.tests.filter(t => t.type === 'performance').length,
    security: currentSuite.tests.filter(t => t.type === 'security').length,
    accessibility: currentSuite.tests.filter(t => t.type === 'accessibility').length
  } : null;

  const historyChartData = validationHistory.slice(0, 10).reverse().map((suite, index) => ({
    run: index + 1,
    passed: suite.tests?.filter(t => t.passed).length || 0,
    failed: suite.tests?.filter(t => !t.passed).length || 0,
    date: new Date(suite.timestamp).toLocaleDateString()
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Validation Dashboard</h2>
          <p className="text-muted-foreground">Automated testing and validation results</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedEntityType} onValueChange={(value: any) => setSelectedEntityType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="question">Question</SelectItem>
              <SelectItem value="test">Test</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={runValidation} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Validation
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.total}</div>
              <p className="text-xs text-muted-foreground">
                Execution time: {(currentSuite!.executionTime / 1000).toFixed(2)}s
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Passed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summaryStats.passed}</div>
              <Progress 
                value={(summaryStats.passed / summaryStats.total) * 100} 
                className="h-2 mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summaryStats.failed}</div>
              <Progress 
                value={(summaryStats.failed / summaryStats.total) * 100} 
                className="h-2 mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summaryStats.critical}</div>
              <Badge variant={summaryStats.critical === 0 ? 'default' : 'destructive'}>
                {summaryStats.critical === 0 ? 'No issues' : `${summaryStats.critical} critical`}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Current Results</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="breakdown">Test Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {currentSuite ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Validation Results</CardTitle>
                    <Badge variant={currentSuite.overallStatus === 'passed' ? 'default' : 'destructive'}>
                      {getStatusIcon(currentSuite.overallStatus)}
                      <span className="ml-2">{currentSuite.overallStatus}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentSuite.tests.map((test) => (
                      <div key={test.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(test.type)}
                            <h4 className="font-medium">{test.name}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            {getSeverityBadge(test.severity)}
                            {getStatusIcon(test.passed ? 'passed' : 'failed')}
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">{test.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Expected:</span>
                            <p className="text-muted-foreground">{test.expected}</p>
                          </div>
                          <div>
                            <span className="font-medium">Actual:</span>
                            <p className={test.passed ? 'text-green-600' : 'text-red-600'}>
                              {test.actual}
                            </p>
                          </div>
                        </div>
                        
                        {test.errorMessage && (
                          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {test.errorMessage}
                          </div>
                        )}
                        
                        <div className="mt-3 flex justify-between items-center text-xs text-muted-foreground">
                          <span>Execution time: {test.executionTime}ms</span>
                          <span>Type: {test.type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Validation Results</h3>
                <p className="text-muted-foreground mb-4">
                  Run a validation to see detailed test results here.
                </p>
                <Button onClick={runValidation} disabled={loading}>
                  {loading ? 'Running...' : 'Run Validation'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validation History</CardTitle>
            </CardHeader>
            <CardContent>
              {validationHistory.length > 0 ? (
                <div className="space-y-3">
                  {validationHistory.map((suite) => (
                    <div key={suite.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(suite.overallStatus)}
                        <div>
                          <p className="font-medium">{suite.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(suite.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {(suite.executionTime / 1000).toFixed(2)}s
                        </p>
                        <Badge variant={suite.overallStatus === 'passed' ? 'default' : 'secondary'}>
                          {suite.overallStatus}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No validation history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          {testTypeBreakdown && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(testTypeBreakdown).map(([type, count]) => (
                <Card key={type}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium capitalize">{type}</CardTitle>
                    {getTypeIcon(type)}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{count}</div>
                    <p className="text-xs text-muted-foreground">
                      {((count / summaryStats!.total) * 100).toFixed(1)}% of total tests
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Results Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={historyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="run" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="passed" stackId="a" fill="hsl(var(--primary))" name="Passed" />
                  <Bar dataKey="failed" stackId="a" fill="hsl(var(--destructive))" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ValidationDashboard;