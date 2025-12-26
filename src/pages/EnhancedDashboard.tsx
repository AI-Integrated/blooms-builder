import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Shield, 
  Target, 
  BarChart3, 
  Settings,
  CheckCircle,
  TrendingUp,
  Users,
  FileText
} from 'lucide-react';
import { TaxonomyMatrix } from '@/components/classification/TaxonomyMatrix';
import PsychometricDashboard from '@/components/analytics/PsychometricDashboard';
import { EnhancedQuestionForm } from '@/components/enhanced/EnhancedQuestionForm';
import { Dashboard } from '@/components/Dashboard';

interface EnhancedDashboardProps {
  userRole: 'admin' | 'teacher';
  userName: string;
  onNavigate?: (section: string) => void;
}

export const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({
  userRole,
  userName,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  const handleQuestionSave = (question: any) => {
    console.log('Question saved:', question);
    setShowQuestionForm(false);
    // Refresh data
  };

  if (showQuestionForm) {
    return (
      <div className="container mx-auto py-8">
        <EnhancedQuestionForm
          onSave={handleQuestionSave}
          onCancel={() => setShowQuestionForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Enhanced Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm rounded-full px-6 py-3">
          <Brain className="w-5 h-5 text-primary" />
          <span className="text-primary font-medium">AI-Powered Assessment System</span>
        </div>
        <h1 className="text-4xl font-bold">
          Welcome back, <span className="text-primary">{userName}</span>! 🎓
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Advanced educational assessment with ML classification, quality assurance, and ISO 25010 compliance
        </p>
      </div>

      {/* Enhanced Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="quality" className="gap-2">
            <Shield className="h-4 w-4" />
            Quality
          </TabsTrigger>
          <TabsTrigger value="taxonomy" className="gap-2">
            <Target className="h-4 w-4" />
            Taxonomy
          </TabsTrigger>
          <TabsTrigger value="psychometrics" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="collaboration" className="gap-2">
            <Users className="h-4 w-4" />
            Collaboration
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2">
            <Settings className="h-4 w-4" />
            Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Dashboard 
            userRole={userRole}
            userName={userName}
            onNavigate={onNavigate}
          />
        </TabsContent>

        
        <TabsContent value="taxonomy">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Two-Way Taxonomy Analysis</h2>
                <p className="text-muted-foreground">
                  Interactive Bloom's Taxonomy × Knowledge Dimension matrix
                </p>
              </div>
              <Button onClick={() => setShowQuestionForm(true)}>
                <FileText className="w-4 h-4 mr-2" />
                Create Question
              </Button>
            </div>
            <TaxonomyMatrix 
              questions={[]} // Would load actual questions
              onCellClick={(bloom, knowledge) => {
                console.log('Cell clicked:', bloom, knowledge);
                // Navigate to questions in this cell
              }}
              showQualityIndicators={true}
              interactive={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="psychometrics">
          <PsychometricDashboard />
        </TabsContent>

        <TabsContent value="collaboration">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Collaborative Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 justify-start"
                    onClick={() => onNavigate?.('collaborative-questions')}
                  >
                    <div className="text-left">
                      <div className="font-medium">Question Bank Collaboration</div>
                      <div className="text-sm text-muted-foreground">Work together on questions</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 justify-start"
                    onClick={() => onNavigate?.('TOS Builder')}
                  >
                    <div className="text-left">
                      <div className="font-medium">Collaborative TOS</div>
                      <div className="text-sm text-muted-foreground">Build TOS together</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 justify-start"
                    onClick={() => onNavigate?.('test-generator')}
                  >
                    <div className="text-left">
                      <div className="font-medium">Team Test Building</div>
                      <div className="text-sm text-muted-foreground">Create tests as a team</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tools">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Advanced Tools & Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 justify-start"
                    onClick={() => setShowQuestionForm(true)}
                  >
                    <div className="text-left">
                      <div className="font-medium">Enhanced Question Builder</div>
                      <div className="text-sm text-muted-foreground">AI-powered question creation</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 justify-start"
                    onClick={() => onNavigate?.('rubric-manager')}
                  >
                    <div className="text-left">
                      <div className="font-medium">Rubric Manager</div>
                      <div className="text-sm text-muted-foreground">Create evaluation rubrics</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 justify-start"
                    onClick={() => onNavigate?.('essay-grading')}
                  >
                    <div className="text-left">
                      <div className="font-medium">Essay Grading</div>
                      <div className="text-sm text-muted-foreground">Grade with rubrics</div>
                    </div>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="h-auto p-4 justify-start"
                    onClick={() => onNavigate?.('multi-version-test')}
                  >
                    <div className="text-left">
                      <div className="font-medium">Multi-Version Tests</div>
                      <div className="text-sm text-muted-foreground">Generate test variants</div>
                    </div>
                  </Button>

                  {userRole === 'admin' && (
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 justify-start"
                      onClick={() => onNavigate?.('ai-approval')}
                    >
                      <div className="text-left">
                        <div className="font-medium">AI Approval Workflow</div>
                        <div className="text-sm text-muted-foreground">Review AI classifications</div>
                      </div>
                    </Button>
                  )}

                  <Button 
                    variant="outline" 
                    className="h-auto p-4 justify-start"
                  >
                    <div className="text-left">
                      <div className="font-medium">Standards Alignment</div>
                      <div className="text-sm text-muted-foreground">Map to curriculum standards</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="font-medium">AI Models</div>
                      <div className="text-sm text-muted-foreground">Active & Ready</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="font-medium">Security</div>
                      <div className="text-sm text-muted-foreground">All Systems Secure</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="font-medium">Performance</div>
                      <div className="text-sm text-muted-foreground">Optimal</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Target className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">Quality Score</div>
                      <div className="text-sm text-muted-foreground">87.3%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
