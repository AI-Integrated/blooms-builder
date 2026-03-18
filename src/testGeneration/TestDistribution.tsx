import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { distributeTestVersions, DistributionStrategy } from '@/services/testGeneration/testDistribution';
import { Shuffle, Users, CheckCircle, AlertCircle } from 'lucide-react';

interface TestDistributionProps {
  parentTestId: string;
  versionIds: string[];
  onComplete?: () => void;
}

export default function TestDistribution({ parentTestId, versionIds, onComplete }: TestDistributionProps) {
  const [strategy, setStrategy] = useState<DistributionStrategy>('balanced');
  const [studentList, setStudentList] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const parseStudentList = (text: string) => {
    return text
      .split('\n')
      .filter(line => line.trim())
      .map((line, index) => {
        const parts = line.split(',').map(p => p.trim());
        return {
          id: parts[0] || `student-${index + 1}`,
          name: parts[1] || parts[0] || `Student ${index + 1}`,
          seatNumber: parts[2]
        };
      });
  };

  const handleDistribute = async () => {
    const students = parseStudentList(studentList);
    
    if (students.length === 0) {
      toast({
        title: "No Students",
        description: "Please enter student information",
        variant: "destructive"
      });
      return;
    }

    if (versionIds.length === 0) {
      toast({
        title: "No Versions",
        description: "No test versions available",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const distributionResult = await distributeTestVersions({
        strategy,
        parentTestId,
        versionIds,
        students,
        seed: strategy === 'random' ? Date.now().toString() : undefined
      });

      setResult(distributionResult);
      
      toast({
        title: "Distribution Complete",
        description: `Assigned ${distributionResult.assignments.length} students to ${versionIds.length} versions`
      });

      onComplete?.();
    } catch (error) {
      console.error('Distribution error:', error);
      toast({
        title: "Distribution Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Test Distribution
          </CardTitle>
          <CardDescription>
            Assign test versions to students using various distribution strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Distribution Strategy</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as DistributionStrategy)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balanced">Balanced - Equal distribution across versions</SelectItem>
                <SelectItem value="random">Random - Randomly assign versions</SelectItem>
                <SelectItem value="sequential">Sequential - Rotate through versions (A, B, C, ...)</SelectItem>
                <SelectItem value="avoid-adjacent">Avoid Adjacent - Different versions for nearby seats</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Student List</Label>
            <Textarea
              placeholder="Enter students (one per line)&#10;Format: StudentID, Name, SeatNumber&#10;Example:&#10;12345, John Doe, A1&#10;12346, Jane Smith, A2"
              value={studentList}
              onChange={(e) => setStudentList(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {parseStudentList(studentList).length} students entered
            </p>
          </div>

          <Button onClick={handleDistribute} disabled={loading} className="w-full">
            {loading ? 'Distributing...' : 'Distribute Test Versions'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.balanceMetrics.isBalanced ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Distribution Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{result.assignments.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Max Difference</p>
                <p className="text-2xl font-bold">{result.balanceMetrics.maxDiff}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Version Distribution</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.balanceMetrics.versionCounts).map(([version, count]) => (
                  <Badge key={version} variant="secondary">
                    Version {version}: {count as number} students
                  </Badge>
                ))}
              </div>
            </div>

            {!result.balanceMetrics.isBalanced && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  Versions are not perfectly balanced. Consider using the "Balanced" strategy for equal distribution.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
