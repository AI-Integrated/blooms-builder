import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Rubrics, type RubricCriterion } from '@/services/db/rubrics';

interface RubricBuilderProps {
  onBack: () => void;
  onSave?: (rubric: any) => void;
  initialData?: {
    id?: string;
    title: string;
    description?: string;
    criteria: RubricCriterion[];
  };
}

export function RubricBuilder({ onBack, onSave, initialData }: RubricBuilderProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [criteria, setCriteria] = useState<RubricCriterion[]>(
    initialData?.criteria || [
      { name: 'Content Quality', weight: 1.0, max_score: 5 },
      { name: 'Organization', weight: 0.8, max_score: 5 },
      { name: 'Grammar & Mechanics', weight: 0.6, max_score: 5 }
    ]
  );
  const [isLoading, setIsLoading] = useState(false);

  const addCriterion = () => {
    setCriteria([
      ...criteria,
      { name: '', weight: 1.0, max_score: 5, order_index: criteria.length }
    ]);
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, field: keyof RubricCriterion, value: any) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const calculateMaxPossibleScore = () => {
    return criteria.reduce((total, criterion) => {
      return total + (criterion.max_score * criterion.weight);
    }, 0).toFixed(1);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title for the rubric');
      return;
    }

    if (criteria.length === 0) {
      toast.error('Please add at least one criterion');
      return;
    }

    if (criteria.some(c => !c.name.trim())) {
      toast.error('Please fill in all criterion names');
      return;
    }

    setIsLoading(true);
    try {
      const rubricData = {
        title: title.trim(),
        description: description.trim(),
        criteria: criteria.map((c, index) => ({
          ...c,
          order_index: index
        }))
      };

      let result;
      if (initialData?.id) {
        result = await Rubrics.update(initialData.id, rubricData);
        toast.success('Rubric updated successfully!');
      } else {
        result = await Rubrics.create(rubricData);
        toast.success('Rubric created successfully!');
      }

      onSave?.(result);
      onBack();
    } catch (error) {
      console.error('Error saving rubric:', error);
      toast.error('Failed to save rubric. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {initialData?.id ? 'Edit Rubric' : 'Create New Rubric'}
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Rubric Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Essay Writing Rubric"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description of this rubric..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Scoring Criteria</CardTitle>
                <Button onClick={addCriterion} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Criterion
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {criteria.map((criterion, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">Criterion {index + 1}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCriterion(index)}
                        className="text-red-600 hover:text-red-700 ml-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <Label htmlFor={`name-${index}`}>Criterion Name</Label>
                        <Input
                          id={`name-${index}`}
                          value={criterion.name}
                          onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                          placeholder="e.g., Content Quality"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`weight-${index}`}>Weight</Label>
                        <Input
                          id={`weight-${index}`}
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          value={criterion.weight}
                          onChange={(e) => updateCriterion(index, 'weight', parseFloat(e.target.value) || 0)}
                          placeholder="1.0"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`max-score-${index}`}>Max Score</Label>
                        <Input
                          id={`max-score-${index}`}
                          type="number"
                          min="1"
                          max="10"
                          value={criterion.max_score}
                          onChange={(e) => updateCriterion(index, 'max_score', parseInt(e.target.value) || 1)}
                          placeholder="5"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {criteria.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No criteria added yet.</p>
                    <p className="text-sm">Click "Add Criterion" to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Rubric Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Criteria</p>
                <p className="text-2xl font-bold">{criteria.length}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Max Possible Score</p>
                <p className="text-2xl font-bold">{calculateMaxPossibleScore()}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Criteria Breakdown:</p>
                {criteria.map((criterion, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="truncate">
                      {criterion.name || `Criterion ${index + 1}`}
                    </span>
                    <span className="text-muted-foreground">
                      {(criterion.max_score * criterion.weight).toFixed(1)}pts
                    </span>
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleSave} 
                className="w-full"
                disabled={isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Rubric'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}