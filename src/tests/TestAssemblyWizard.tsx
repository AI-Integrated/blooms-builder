import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Settings, Target, BarChart3, CheckCircle, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConstraintSolver, TestConstraint } from '@/services/testAssembly/constraintSolver';

interface TestAssemblyWizardProps {
  questionPool: any[];
  onTestGenerated: (result: any) => void;
  onCancel: () => void;
}

export function TestAssemblyWizard({ questionPool, onTestGenerated, onCancel }: TestAssemblyWizardProps) {
  const [step, setStep] = useState(1);
  const [testLength, setTestLength] = useState(30);
  const [numberOfForms, setNumberOfForms] = useState(1);
  const [constraints, setConstraints] = useState<TestConstraint[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Constraint configurations
  const [topicDistribution, setTopicDistribution] = useState<Record<string, number>>({});
  const [difficultyConfig, setDifficultyConfig] = useState({
    easyPercent: 0.3,
    averagePercent: 0.5,
    difficultPercent: 0.2
  });
  const [bloomConfig, setBloomConfig] = useState<Record<string, number>>({
    remembering: 5,
    understanding: 8,
    applying: 10,
    analyzing: 5,
    evaluating: 1,
    creating: 1
  });
  const [timeLimit, setTimeLimit] = useState(60);
  const [enableOptimization, setEnableOptimization] = useState(true);
  
  const handleOptimizeLength = () => {
    const result = ConstraintSolver.optimizeTestLength(
      questionPool,
      constraints,
      10,
      100,
      0.8
    );
    
    setTestLength(result.optimalLength);
    toast.success(`Recommended length: ${result.optimalLength} questions`, {
      description: result.reasoning.join(' • ')
    });
  };
  
  const handleAddConstraint = (type: string) => {
    let config: any = {};
    
    switch (type) {
      case 'topic_coverage':
        config = { distribution: topicDistribution };
        break;
      case 'difficulty_balance':
        config = difficultyConfig;
        break;
      case 'bloom_distribution':
        config = { distribution: bloomConfig };
        break;
      case 'time_limit':
        config = { maxTime: timeLimit };
        break;
    }
    
    const newConstraint: TestConstraint = {
      type: type as any,
      config,
      priority: 5,
      isRequired: true
    };
    
    setConstraints([...constraints, newConstraint]);
    toast.success(`Added ${type} constraint`);
  };
  
  const handleGenerateTest = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    try {
      // Step 1: Validate constraints
      setGenerationProgress(20);
      if (constraints.length === 0) {
        toast.warning('No constraints defined. Using default settings.');
      }
      
      // Step 2: Assemble test(s)
      setGenerationProgress(40);
      let results;
      
      if (numberOfForms > 1) {
        results = ConstraintSolver.generateParallelForms(
          questionPool,
          constraints,
          testLength,
          numberOfForms
        );
      } else {
        const result = ConstraintSolver.assembleTest(
          questionPool,
          constraints,
          testLength
        );
        results = [result];
      }
      
      setGenerationProgress(70);
      
      // Step 3: Validate balance
      const balanceChecks = results.map(r => 
        ConstraintSolver.balanceContent(r.selectedQuestions, constraints)
      );
      
      setGenerationProgress(90);
      
      // Show warnings if needed
      balanceChecks.forEach((check, idx) => {
        if (!check.isBalanced) {
          toast.warning(`Form ${idx + 1} has balance issues`, {
            description: check.recommendations.slice(0, 2).join(' • ')
          });
        }
      });
      
      setGenerationProgress(100);
      toast.success(`Generated ${results.length} test form(s) successfully!`);
      
      onTestGenerated(results);
    } catch (error) {
      console.error('Error generating test:', error);
      toast.error('Failed to generate test');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Advanced Test Assembly Wizard
          </CardTitle>
          <CardDescription>
            Configure constraints and optimize test construction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={`step-${step}`} onValueChange={(v) => setStep(parseInt(v.split('-')[1]))}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="step-1">
                <Settings className="h-4 w-4 mr-2" />
                Basic Settings
              </TabsTrigger>
              <TabsTrigger value="step-2">
                <Target className="h-4 w-4 mr-2" />
                Constraints
              </TabsTrigger>
              <TabsTrigger value="step-3">
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate
              </TabsTrigger>
            </TabsList>
            
            {/* Step 1: Basic Settings */}
            <TabsContent value="step-1" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Test Length</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[testLength]}
                      onValueChange={([v]) => setTestLength(v)}
                      min={10}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={testLength}
                      onChange={(e) => setTestLength(parseInt(e.target.value))}
                      className="w-20"
                    />
                    {enableOptimization && (
                      <Button variant="outline" size="sm" onClick={handleOptimizeLength}>
                        Optimize
                      </Button>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Number of Parallel Forms</Label>
                  <Select value={String(numberOfForms)} onValueChange={(v) => setNumberOfForms(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={String(n)}>
                          {n} Form{n > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Time Limit (minutes)</Label>
                  <Input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Enable Intelligent Optimization</Label>
                  <Switch
                    checked={enableOptimization}
                    onCheckedChange={setEnableOptimization}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={() => setStep(2)}>Next: Configure Constraints</Button>
              </div>
            </TabsContent>
            
            {/* Step 2: Constraints */}
            <TabsContent value="step-2" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Difficulty Balance</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Easy (%)</Label>
                      <Input
                        type="number"
                        value={difficultyConfig.easyPercent * 100}
                        onChange={(e) => setDifficultyConfig({
                          ...difficultyConfig,
                          easyPercent: parseFloat(e.target.value) / 100
                        })}
                      />
                    </div>
                    <div>
                      <Label>Average (%)</Label>
                      <Input
                        type="number"
                        value={difficultyConfig.averagePercent * 100}
                        onChange={(e) => setDifficultyConfig({
                          ...difficultyConfig,
                          averagePercent: parseFloat(e.target.value) / 100
                        })}
                      />
                    </div>
                    <div>
                      <Label>Difficult (%)</Label>
                      <Input
                        type="number"
                        value={difficultyConfig.difficultPercent * 100}
                        onChange={(e) => setDifficultyConfig({
                          ...difficultyConfig,
                          difficultPercent: parseFloat(e.target.value) / 100
                        })}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => handleAddConstraint('difficulty_balance')}
                  >
                    Add Difficulty Constraint
                  </Button>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-3">Bloom's Taxonomy Distribution</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(bloomConfig).map(([level, count]) => (
                      <div key={level}>
                        <Label className="capitalize">{level}</Label>
                        <Input
                          type="number"
                          value={count}
                          onChange={(e) => setBloomConfig({
                            ...bloomConfig,
                            [level]: parseInt(e.target.value)
                          })}
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => handleAddConstraint('bloom_distribution')}
                  >
                    Add Bloom Constraint
                  </Button>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-3">Active Constraints</h4>
                  <div className="flex flex-wrap gap-2">
                    {constraints.map((c, idx) => (
                      <Badge key={idx} variant="secondary">
                        {c.type.replace('_', ' ')}
                        <button
                          onClick={() => setConstraints(constraints.filter((_, i) => i !== idx))}
                          className="ml-2 text-xs hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    {constraints.length === 0 && (
                      <span className="text-sm text-muted-foreground">No constraints added yet</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)}>Next: Generate</Button>
              </div>
            </TabsContent>
            
            {/* Step 3: Generate */}
            <TabsContent value="step-3" className="space-y-6">
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium">Configuration Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Test Length: <strong>{testLength}</strong> questions</div>
                    <div>Parallel Forms: <strong>{numberOfForms}</strong></div>
                    <div>Time Limit: <strong>{timeLimit}</strong> minutes</div>
                    <div>Constraints: <strong>{constraints.length}</strong> active</div>
                  </div>
                </div>
                
                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Generating test...</span>
                      <span>{generationProgress}%</span>
                    </div>
                    <Progress value={generationProgress} />
                  </div>
                )}
                
                {!isGenerating && constraints.length > 0 && (
                  <div className="space-y-2">
                    <Label>Constraint Priorities</Label>
                    {constraints.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <span className="text-sm flex-1 capitalize">{c.type.replace('_', ' ')}</span>
                        <Badge variant={c.isRequired ? 'default' : 'secondary'}>
                          {c.isRequired ? 'Required' : 'Optional'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">Priority: {c.priority}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep(2)} disabled={isGenerating}>
                  Back
                </Button>
                <Button onClick={handleGenerateTest} disabled={isGenerating}>
                  {isGenerating ? 'Generating...' : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Generate Test
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
