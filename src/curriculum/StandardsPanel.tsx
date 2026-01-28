import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BookOpen, CheckCircle, AlertCircle, Link as LinkIcon, Search } from 'lucide-react';
import { toast } from 'sonner';
import { StandardsMapper, type EducationalStandard } from '@/services/curriculum/standardsMapper';

interface StandardsPanelProps {
  questionId?: string;
  onMappingComplete?: (mappings: any[]) => void;
}

export function StandardsPanel({ questionId, onMappingComplete }: StandardsPanelProps) {
  const [standards, setStandards] = useState<EducationalStandard[]>([]);
  const [filteredStandards, setFilteredStandards] = useState<EducationalStandard[]>([]);
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [alignmentAnalysis, setAlignmentAnalysis] = useState<any>(null);
  
  useEffect(() => {
    loadStandards();
  }, []);
  
  useEffect(() => {
    filterStandards();
  }, [standards, searchQuery, categoryFilter, subjectFilter]);
  
  const loadStandards = async () => {
    try {
      setLoading(true);
      const data = await StandardsMapper.getStandards();
      setStandards(data);
      setFilteredStandards(data);
    } catch (error) {
      console.error('Error loading standards:', error);
      toast.error('Failed to load standards');
    } finally {
      setLoading(false);
    }
  };
  
  const filterStandards = () => {
    let filtered = [...standards];
    
    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(s => s.category === categoryFilter);
    }
    
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(s => s.subject_area === subjectFilter);
    }
    
    setFilteredStandards(filtered);
  };
  
  const handleToggleStandard = (standardId: string) => {
    setSelectedStandards(prev =>
      prev.includes(standardId)
        ? prev.filter(id => id !== standardId)
        : [...prev, standardId]
    );
  };
  
  const handleMapStandards = async () => {
    if (!questionId) {
      toast.error('No question selected');
      return;
    }
    
    try {
      const mappings = await Promise.all(
        selectedStandards.map(standardId =>
          StandardsMapper.mapQuestionToStandard({
            question_id: questionId,
            standard_id: standardId,
            alignment_strength: 0.8 // Default, can be adjusted
          })
        )
      );
      
      toast.success(`Mapped ${mappings.length} standards to question`);
      onMappingComplete?.(mappings);
    } catch (error) {
      console.error('Error mapping standards:', error);
      toast.error('Failed to map standards');
    }
  };
  
  const handleAnalyzeAlignment = async (questionIds: string[]) => {
    try {
      const analysis = await StandardsMapper.analyzeTestAlignment(questionIds);
      setAlignmentAnalysis(analysis);
      
      const report = StandardsMapper.generateComplianceReport(analysis);
      toast.success(report.summary, {
        description: report.details.join(' • ')
      });
    } catch (error) {
      console.error('Error analyzing alignment:', error);
      toast.error('Failed to analyze alignment');
    }
  };
  
  const uniqueCategories = [...new Set(standards.map(s => s.category))];
  const uniqueSubjects = [...new Set(standards.map(s => s.subject_area))];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Curriculum Standards
        </CardTitle>
        <CardDescription>
          Map questions to educational standards and validate alignment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="browse">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse">Browse Standards</TabsTrigger>
            <TabsTrigger value="mapping">Mapping</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>
          
          {/* Browse Standards Tab */}
          <TabsContent value="browse" className="space-y-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search standards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {uniqueCategories.map(cat => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Subject Area</Label>
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {uniqueSubjects.map(subj => (
                        <SelectItem key={subj} value={subj}>
                          {subj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading standards...</div>
                  ) : filteredStandards.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No standards found</div>
                  ) : (
                    filteredStandards.map(standard => (
                      <div
                        key={standard.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleToggleStandard(standard.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                                {standard.code}
                              </code>
                              <Badge variant="outline" className="capitalize">
                                {standard.category}
                              </Badge>
                              {selectedStandards.includes(standard.id) && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <h4 className="font-medium mt-1">{standard.title}</h4>
                            {standard.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {standard.description}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              {standard.framework && (
                                <Badge variant="secondary">{standard.framework}</Badge>
                              )}
                              {standard.grade_level && (
                                <Badge variant="secondary">Grade {standard.grade_level}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          
          {/* Mapping Tab */}
          <TabsContent value="mapping" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Selected Standards</h4>
                {selectedStandards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No standards selected</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedStandards.map(id => {
                      const standard = standards.find(s => s.id === id);
                      return standard ? (
                        <Badge key={id} variant="secondary">
                          {standard.code}
                          <button
                            onClick={() => handleToggleStandard(id)}
                            className="ml-2 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              
              {questionId && selectedStandards.length > 0 && (
                <Button onClick={handleMapStandards} className="w-full">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Map {selectedStandards.length} Standard{selectedStandards.length !== 1 ? 's' : ''} to Question
                </Button>
              )}
            </div>
          </TabsContent>
          
          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-4">
            {alignmentAnalysis ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Overall Alignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {(alignmentAnalysis.overallAlignment * 100).toFixed(0)}%
                      </div>
                      <Progress value={alignmentAnalysis.overallAlignment * 100} className="mt-2" />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Standards Coverage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {Object.keys(alignmentAnalysis.standardsCoverage).length}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">standards covered</p>
                    </CardContent>
                  </Card>
                </div>
                
                {alignmentAnalysis.unmappedQuestions.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-900">Unmapped Questions</h4>
                        <p className="text-sm text-yellow-800 mt-1">
                          {alignmentAnalysis.unmappedQuestions.length} questions need standards mapping
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {alignmentAnalysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                      {alignmentAnalysis.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Run alignment analysis to see compliance report</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
