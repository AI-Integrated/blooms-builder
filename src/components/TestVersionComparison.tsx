import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Shuffle, Target } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  topic: string;
  bloom_level: string;
  difficulty: string;
  choices?: Record<string, string>;
  correct_answer?: string;
}

interface TestVersion {
  version_label: string;
  questions: Question[];
  answer_key: Record<string, string>;
  total_points: number;
}

interface TestVersionComparisonProps {
  versions: TestVersion[];
  originalQuestions: Question[];
}

export const TestVersionComparison: React.FC<TestVersionComparisonProps> = ({
  versions,
  originalQuestions
}) => {
  // Analyze distribution across versions
  const analyzeDistribution = () => {
    const analysis = {
      topicDistribution: {} as Record<string, Record<string, number>>,
      difficultyDistribution: {} as Record<string, Record<string, number>>,
      bloomDistribution: {} as Record<string, Record<string, number>>,
      questionOrderChanges: {} as Record<string, number>
    };

    versions.forEach(version => {
      // Initialize distributions for this version
      analysis.topicDistribution[version.version_label] = {};
      analysis.difficultyDistribution[version.version_label] = {};
      analysis.bloomDistribution[version.version_label] = {};

      version.questions.forEach((question, index) => {
        // Topic distribution
        const topic = question.topic;
        analysis.topicDistribution[version.version_label][topic] = 
          (analysis.topicDistribution[version.version_label][topic] || 0) + 1;

        // Difficulty distribution
        const difficulty = question.difficulty;
        analysis.difficultyDistribution[version.version_label][difficulty] = 
          (analysis.difficultyDistribution[version.version_label][difficulty] || 0) + 1;

        // Bloom's distribution
        const bloom = question.bloom_level;
        analysis.bloomDistribution[version.version_label][bloom] = 
          (analysis.bloomDistribution[version.version_label][bloom] || 0) + 1;

        // Track question order changes
        const originalIndex = originalQuestions.findIndex(oq => oq.id === question.id);
        if (originalIndex !== -1 && originalIndex !== index) {
          analysis.questionOrderChanges[version.version_label] = 
            (analysis.questionOrderChanges[version.version_label] || 0) + 1;
        }
      });
    });

    return analysis;
  };

  const analysis = analyzeDistribution();

  // Get all unique topics, difficulties, and bloom levels
  const allTopics = [...new Set(originalQuestions.map(q => q.topic))];
  const allDifficulties = ['easy', 'average', 'difficult'];
  const allBloomLevels = ['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'];

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Version Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{versions.length}</div>
              <div className="text-sm text-muted-foreground">Total Versions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">
                {versions[0]?.questions.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Questions per Version</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {Math.round(Object.values(analysis.questionOrderChanges).reduce((sum, changes) => sum + changes, 0) / versions.length)}
              </div>
              <div className="text-sm text-muted-foreground">Avg. Order Changes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {versions[0]?.total_points || 0}
              </div>
              <div className="text-sm text-muted-foreground">Points per Version</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Topic Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Topic Distribution Across Versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                {versions.map(version => (
                  <TableHead key={version.version_label} className="text-center">
                    Version {version.version_label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTopics.map(topic => (
                <TableRow key={topic}>
                  <TableCell className="font-medium">{topic}</TableCell>
                  {versions.map(version => (
                    <TableCell key={version.version_label} className="text-center">
                      <Badge variant="outline">
                        {analysis.topicDistribution[version.version_label][topic] || 0}
                      </Badge>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Difficulty Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Difficulty Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Difficulty Level</TableHead>
                {versions.map(version => (
                  <TableHead key={version.version_label} className="text-center">
                    Version {version.version_label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allDifficulties.map(difficulty => (
                <TableRow key={difficulty}>
                  <TableCell className="font-medium capitalize">{difficulty}</TableCell>
                  {versions.map(version => (
                    <TableCell key={version.version_label} className="text-center">
                      <Badge 
                        variant={difficulty === 'easy' ? 'secondary' : difficulty === 'average' ? 'default' : 'destructive'}
                      >
                        {analysis.difficultyDistribution[version.version_label][difficulty] || 0}
                      </Badge>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bloom's Taxonomy Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Bloom's Taxonomy Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bloom's Level</TableHead>
                {versions.map(version => (
                  <TableHead key={version.version_label} className="text-center">
                    Version {version.version_label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allBloomLevels.map(bloom => (
                <TableRow key={bloom}>
                  <TableCell className="font-medium capitalize">{bloom}</TableCell>
                  {versions.map(version => (
                    <TableCell key={version.version_label} className="text-center">
                      <Badge variant="outline">
                        {analysis.bloomDistribution[version.version_label][bloom] || 0}
                      </Badge>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Question Order Changes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="w-5 h-5" />
            Question Order Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {versions.map(version => (
              <div key={version.version_label} className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary mb-2">
                  {analysis.questionOrderChanges[version.version_label] || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Version {version.version_label} Order Changes
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round(((analysis.questionOrderChanges[version.version_label] || 0) / version.questions.length) * 100)}% different
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};