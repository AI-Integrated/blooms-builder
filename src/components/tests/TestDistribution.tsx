import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Users, AlertCircle, CheckCircle, Shuffle } from 'lucide-react';
import {
  distributeTests,
  getAvailableVersions,
  getTestAssignments,
  validateDistributionBalance,
  type Student,
  type DistributionConfig
} from '@/services/tests/testDistribution';

interface TestDistributionProps {
  parentTestId: string;
  onBack?: () => void;
}

export function TestDistribution({ parentTestId, onBack }: TestDistributionProps) {
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<DistributionConfig['strategy']>('balanced');
  const [students, setStudents] = useState<Student[]>([]);
  const [studentInput, setStudentInput] = useState('');
  const [versions, setVersions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);

  useEffect(() => {
    loadVersions();
    loadExistingAssignments();
  }, [parentTestId]);

  const loadVersions = async () => {
    try {
      const data = await getAvailableVersions(parentTestId);
      setVersions(data);
    } catch (error) {
      console.error('Error loading versions:', error);
      toast.error('Failed to load test versions');
    }
  };

  const loadExistingAssignments = async () => {
    try {
      const data = await getTestAssignments(parentTestId);
      setAssignments(data);

      if (data.length > 0) {
        const balanceData = await validateDistributionBalance(parentTestId);
        setBalance(balanceData?.[0]);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const parseStudents = () => {
    const lines = studentInput.trim().split('\n');
    const parsed: Student[] = [];

    lines.forEach(line => {
      const parts = line.trim().split(',').map(p => p.trim());
      if (parts.length >= 2) {
        parsed.push({
          id: parts[0],
          name: parts[1],
          seatNumber: parts[2] || undefined
        });
      }
    });

    return parsed;
  };

  const handleDistribute = async () => {
    const parsedStudents = parseStudents();
    
    if (parsedStudents.length === 0) {
      toast.error('Please add students before distributing');
      return;
    }

    if (versions.length < 2) {
      toast.error('At least 2 test versions are required');
      return;
    }

    setLoading(true);

    try {
      const config: DistributionConfig = {
        parentTestId,
        students: parsedStudents,
        strategy,
        preventAdjacentSame: strategy === 'avoid_adjacent'
      };

      const result = await distributeTests(config);

      if (result.success) {
        toast.success(`Successfully distributed tests to ${parsedStudents.length} students`);
        setStudentInput('');
        setStudents([]);
        loadExistingAssignments();
      } else {
        toast.error(result.error || 'Distribution failed');
      }
    } catch (error) {
      console.error('Distribution error:', error);
      toast.error('Failed to distribute tests');
    } finally {
      setLoading(false);
    }
  };

  const getVersionColor = (versionLabel: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
    const index = versionLabel.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {onBack && (
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Distribution</h1>
          <p className="text-muted-foreground">Securely assign test versions to students</p>
        </div>
        <Badge variant="outline" className="text-lg">
          {versions.length} Versions Available
        </Badge>
      </div>

      {/* Available Versions */}
      <Card>
        <CardHeader>
          <CardTitle>Available Test Versions</CardTitle>
          <CardDescription>
            Multiple versions are available for secure distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {versions.map(version => (
              <Badge key={version.id} variant="secondary" className="text-sm">
                Version {version.version_label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribution Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution Strategy</CardTitle>
          <CardDescription>Choose how test versions will be assigned</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="strategy">Strategy</Label>
            <Select value={strategy} onValueChange={(v: any) => setStrategy(v)}>
              <SelectTrigger id="strategy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random - Unpredictable distribution</SelectItem>
                <SelectItem value="sequential">Sequential - Round-robin assignment</SelectItem>
                <SelectItem value="balanced">Balanced - Equal distribution</SelectItem>
                <SelectItem value="avoid_adjacent">Avoid Adjacent - No neighbors with same version</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              {strategy === 'random' && 'Tests are randomly assigned to students.'}
              {strategy === 'sequential' && 'Tests are assigned in order, cycling through versions.'}
              {strategy === 'balanced' && 'Ensures each version is distributed equally across students.'}
              {strategy === 'avoid_adjacent' && 'Prevents students sitting next to each other from receiving the same version (requires seat numbers).'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Student Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Add Students
          </CardTitle>
          <CardDescription>
            Enter student information (one per line): StudentID, Name, SeatNumber (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="students">Student List</Label>
            <Textarea
              id="students"
              placeholder="12345, John Doe, A1&#10;12346, Jane Smith, A2&#10;12347, Bob Johnson, B1"
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Parsed: {parseStudents().length} students
            </p>
          </div>

          <Button 
            onClick={handleDistribute} 
            disabled={loading || parseStudents().length === 0}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Distributing...
              </>
            ) : (
              <>
                <Shuffle className="mr-2 h-4 w-4" />
                Distribute Test Versions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Distribution Summary */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribution Summary</CardTitle>
            <CardDescription>Current test assignments and balance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {balance && (
              <div className={`p-4 rounded-lg border ${balance.is_balanced ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <div className="flex items-center gap-2">
                  {balance.is_balanced ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <span className="font-medium">{balance.warning_message}</span>
                </div>
                {!balance.is_balanced && (
                  <p className="text-sm mt-2">
                    Maximum difference: {balance.max_diff} assignments between versions
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Version Distribution ({assignments.length} total assignments)</Label>
              <div className="grid gap-2">
                {Object.entries(
                  assignments.reduce((acc: any, a: any) => {
                    const label = a.generated_tests?.version_label || 'Unknown';
                    acc[label] = (acc[label] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between p-3 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getVersionColor(label)}`} />
                      <span className="font-medium">Version {label}</span>
                    </div>
                    <Badge variant="secondary">{String(count)} students</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
