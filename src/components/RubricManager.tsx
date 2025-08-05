import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Printer, 
  Download,
  Star,
  Users,
  BookOpen,
  Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RubricPrintout } from "./RubricPrintout";

interface Criterion {
  name: string;
  description: string;
  points: number;
}

interface PerformanceLevel {
  level: string;
  description: string;
  percentage: number;
}

interface Rubric {
  id: string;
  title: string;
  description?: string;
  subject: string;
  grade_level?: string;
  total_points: number;
  criteria: Criterion[];
  performance_levels: PerformanceLevel[];
  created_by: string;
  created_at: string;
}

interface RubricManagerProps {
  onBack: () => void;
}

export const RubricManager = ({ onBack }: RubricManagerProps) => {
  const { toast } = useToast();
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPrintout, setShowPrintout] = useState(false);
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    grade_level: "",
    total_points: 100,
    criteria: [{ name: "", description: "", points: 0 }] as Criterion[],
    performance_levels: [
      { level: "Excellent", description: "Exceeds expectations", percentage: 90 },
      { level: "Good", description: "Meets expectations", percentage: 75 },
      { level: "Fair", description: "Approaching expectations", percentage: 60 },
      { level: "Poor", description: "Below expectations", percentage: 40 }
    ] as PerformanceLevel[]
  });

  useEffect(() => {
    fetchRubrics();
  }, []);

  const fetchRubrics = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('rubrics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setRubrics(data || []);
    } catch (error) {
      console.error('Error fetching rubrics:', error);
      toast({
        title: "Error",
        description: "Failed to load rubrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRubric = async () => {
    try {
      if (!formData.title || !formData.subject || formData.criteria.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const rubricData = {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        grade_level: formData.grade_level,
        total_points: formData.total_points,
        criteria: formData.criteria,
        performance_levels: formData.performance_levels,
        created_by: 'teacher'
      };

      let result;
      if (editingRubric) {
        result = await (supabase as any)
          .from('rubrics')
          .update(rubricData)
          .eq('id', editingRubric.id);
      } else {
        result = await (supabase as any)
          .from('rubrics')
          .insert([rubricData]);
      }

      if (result.error) {
        throw result.error;
      }

      toast({
        title: "Success",
        description: editingRubric ? "Rubric updated successfully!" : "Rubric created successfully!",
      });

      setShowAddForm(false);
      setEditingRubric(null);
      resetForm();
      await fetchRubrics();
    } catch (error) {
      console.error('Error saving rubric:', error);
      toast({
        title: "Error",
        description: "Failed to save rubric",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRubric = async (rubricId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('rubrics')
        .delete()
        .eq('id', rubricId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Rubric deleted successfully!",
      });

      await fetchRubrics();
    } catch (error) {
      console.error('Error deleting rubric:', error);
      toast({
        title: "Error",
        description: "Failed to delete rubric",
        variant: "destructive",
      });
    }
  };

  const handleEditRubric = (rubric: Rubric) => {
    setEditingRubric(rubric);
    setFormData({
      title: rubric.title,
      description: rubric.description || "",
      subject: rubric.subject,
      grade_level: rubric.grade_level || "",
      total_points: rubric.total_points,
      criteria: rubric.criteria,
      performance_levels: rubric.performance_levels
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      subject: "",
      grade_level: "",
      total_points: 100,
      criteria: [{ name: "", description: "", points: 0 }],
      performance_levels: [
        { level: "Excellent", description: "Exceeds expectations", percentage: 90 },
        { level: "Good", description: "Meets expectations", percentage: 75 },
        { level: "Fair", description: "Approaching expectations", percentage: 60 },
        { level: "Poor", description: "Below expectations", percentage: 40 }
      ]
    });
  };

  const addCriterion = () => {
    setFormData(prev => ({
      ...prev,
      criteria: [...prev.criteria, { name: "", description: "", points: 0 }]
    }));
  };

  const removeCriterion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index)
    }));
  };

  const updateCriterion = (index: number, field: keyof Criterion, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria.map((criterion, i) => 
        i === index ? { ...criterion, [field]: value } : criterion
      )
    }));
  };

  const subjects = ["English Language Arts", "Mathematics", "Science", "Social Studies", "History", "Computer Science"];
  const gradeLevels = ["Elementary", "Middle School", "High School", "College"];

  const filteredRubrics = rubrics.filter(rubric => {
    return (
      (searchTerm === "" || rubric.title.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedSubject === "" || selectedSubject === "all" || rubric.subject === selectedSubject)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom section-padding">
        {/* Header */}
        <div className="text-center mb-16 animate-slide-in-down">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Assessment Rubrics</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            Rubric <span className="text-shimmer">Manager</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Create, manage, and print comprehensive evaluation rubrics for essay assessments
          </p>
          <Button variant="outline" onClick={onBack} className="interactive focus-ring">
            ← Back to Dashboard
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 animate-slide-in-up stagger-1">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold text-primary mb-1">
                {rubrics.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Rubrics</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-secondary/20 rounded-xl">
                  <BookOpen className="w-6 h-6 text-secondary" />
                </div>
              </div>
              <div className="text-3xl font-bold text-secondary mb-1">
                {[...new Set(rubrics.map(r => r.subject))].length}
              </div>
              <div className="text-sm text-muted-foreground">Subjects</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent/20 rounded-xl">
                  <Star className="w-6 h-6 text-accent" />
                </div>
              </div>
              <div className="text-3xl font-bold text-accent mb-1">
                {Math.round(rubrics.reduce((sum, r) => sum + r.total_points, 0) / rubrics.length) || 0}
              </div>
              <div className="text-sm text-muted-foreground">Avg. Points</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20 card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <Users className="w-6 h-6 text-green-500" />
                </div>
              </div>
              <div className="text-3xl font-bold text-green-500 mb-1">
                {rubrics.reduce((sum, r) => sum + r.criteria.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Criteria</div>
            </CardContent>
          </Card>
        </div>

        {/* Show Printout Modal */}
        {showPrintout && selectedRubric && (
          <RubricPrintout 
            rubric={selectedRubric} 
            onClose={() => {
              setShowPrintout(false);
              setSelectedRubric(null);
            }} 
          />
        )}

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-8 animate-slide-in-up stagger-2">
          <h2 className="text-2xl font-bold text-foreground">Rubrics Library</h2>
          <Button 
            onClick={() => {
              setEditingRubric(null);
              resetForm();
              setShowAddForm(!showAddForm);
            }} 
            className="bg-gradient-primary hover:shadow-glow btn-hover interactive focus-ring"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Rubric
          </Button>
        </div>

        {/* Add/Edit Rubric Form */}
        {showAddForm && (
          <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-elegant mb-8 animate-fade-in-scale">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Target className="w-6 h-6 text-primary" />
                {editingRubric ? "Edit Rubric" : "Create New Rubric"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Rubric Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Essay Writing Rubric"
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Select 
                    value={formData.subject} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="grade_level">Grade Level</Label>
                  <Select 
                    value={formData.grade_level} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, grade_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade level" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeLevels.map((level) => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="total_points">Total Points</Label>
                  <Input
                    id="total_points"
                    type="number"
                    value={formData.total_points}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_points: parseInt(e.target.value) || 100 }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this rubric..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Criteria Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-lg font-semibold">Evaluation Criteria *</Label>
                  <Button onClick={addCriterion} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Criterion
                  </Button>
                </div>
                <div className="space-y-4">
                  {formData.criteria.map((criterion, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-3">
                          <Label>Criterion Name</Label>
                          <Input
                            value={criterion.name}
                            onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                            placeholder="e.g., Thesis Statement"
                          />
                        </div>
                        <div className="md:col-span-6">
                          <Label>Description</Label>
                          <Input
                            value={criterion.description}
                            onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                            placeholder="e.g., Clear, focused, and well-developed thesis"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Points</Label>
                          <Input
                            type="number"
                            value={criterion.points}
                            onChange={(e) => updateCriterion(index, 'points', parseInt(e.target.value) || 0)}
                            placeholder="20"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Button
                            onClick={() => removeCriterion(index)}
                            variant="outline"
                            size="sm"
                            disabled={formData.criteria.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-border/50">
                <Button onClick={handleSaveRubric} className="bg-gradient-primary hover:shadow-glow btn-hover focus-ring">
                  {editingRubric ? "Update Rubric" : "Create Rubric"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingRubric(null);
                    resetForm();
                  }} 
                  className="focus-ring"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-card mb-8 animate-slide-in-up stagger-3">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search rubrics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedSubject("all");
                }}
                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 focus-ring"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rubrics List */}
        <div className="space-y-6 animate-slide-in-up stagger-4">
          {loading ? (
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
              <CardContent className="p-12 text-center">
                <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50 animate-spin" />
                <p className="text-muted-foreground">Loading rubrics...</p>
              </CardContent>
            </Card>
          ) : filteredRubrics.length === 0 ? (
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 animate-fade-in-scale">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No rubrics found</h3>
                <p className="text-muted-foreground">Try adjusting your search criteria or create a new rubric.</p>
              </CardContent>
            </Card>
          ) : (
            filteredRubrics.map((rubric) => (
              <Card key={rubric.id} className="bg-card/80 backdrop-blur-sm border border-border/50 card-hover">
                <CardContent className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-foreground">{rubric.title}</h3>
                        <Badge variant="outline">{rubric.subject}</Badge>
                        {rubric.grade_level && (
                          <Badge variant="secondary">{rubric.grade_level}</Badge>
                        )}
                      </div>
                      {rubric.description && (
                        <p className="text-muted-foreground mb-4">{rubric.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <span className="text-sm text-muted-foreground">Total Points</span>
                          <p className="font-semibold">{rubric.total_points}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Criteria</span>
                          <p className="font-semibold">{rubric.criteria.length}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Performance Levels</span>
                          <p className="font-semibold">{rubric.performance_levels.length}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Created</span>
                          <p className="font-semibold">{new Date(rubric.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Criteria Preview */}
                      <div>
                        <span className="text-sm text-muted-foreground mb-2 block">Evaluation Criteria</span>
                        <div className="flex flex-wrap gap-2">
                          {rubric.criteria.slice(0, 3).map((criterion, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {criterion.name} ({criterion.points}pts)
                            </Badge>
                          ))}
                          {rubric.criteria.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{rubric.criteria.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => {
                          setSelectedRubric(rubric);
                          setShowPrintout(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="interactive focus-ring"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleEditRubric(rubric)}
                        variant="outline"
                        size="sm"
                        className="interactive focus-ring"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteRubric(rubric.id)}
                        variant="outline"
                        size="sm"
                        className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 focus-ring"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};