import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BookOpen, Target, Users } from 'lucide-react';
import { RubricBuilder } from '@/components/RubricBuilder';
import { RubricScoringInterface } from '@/components/RubricScoringInterface';

type View = 'list' | 'builder' | 'scoring';

export default function Rubrics() {
  const [activeView, setActiveView] = useState<View>('list');
  const [selectedRubric, setSelectedRubric] = useState<any>(null);
  const [scoringContext, setScoringContext] = useState<{
    rubricId: string;
    questionId: string;
    testId?: string;
    studentId?: string;
    studentName?: string;
  } | null>(null);

  const handleCreateRubric = () => {
    setSelectedRubric(null);
    setActiveView('builder');
  };

  const handleEditRubric = (rubric: any) => {
    setSelectedRubric(rubric);
    setActiveView('builder');
  };

  const handleScoreWithRubric = (context: any) => {
    setScoringContext(context);
    setActiveView('scoring');
  };

  const renderContent = () => {
    switch (activeView) {
      case 'builder':
        return (
          <RubricBuilder
            onBack={() => setActiveView('list')}
            onSave={() => setActiveView('list')}
            initialData={selectedRubric}
          />
        );
      
      case 'scoring':
        return scoringContext ? (
          <RubricScoringInterface
            rubricId={scoringContext.rubricId}
            questionId={scoringContext.questionId}
            testId={scoringContext.testId}
            studentId={scoringContext.studentId}
            studentName={scoringContext.studentName}
            onBack={() => setActiveView('list')}
            onScoreSaved={() => setActiveView('list')}
          />
        ) : null;
      
      default:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Rubrics</h1>
                <p className="text-muted-foreground">
                  Create and manage scoring rubrics for essay and short answer questions
                </p>
              </div>
              <Button onClick={handleCreateRubric}>
                <Plus className="h-4 w-4 mr-2" />
                Create Rubric
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Rubrics</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    +2 from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Scoring</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-xs text-muted-foreground">
                    Currently in use
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Students Graded</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground">
                    This semester
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Rubric List */}
            <Card>
              <CardHeader>
                <CardTitle>Your Rubrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No rubrics created yet</p>
                  <p className="text-sm">Create your first rubric to get started with scoring</p>
                  <Button 
                    onClick={handleCreateRubric} 
                    className="mt-4"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Rubric
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return <Layout>{renderContent()}</Layout>;
}