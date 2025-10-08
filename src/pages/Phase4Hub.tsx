import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, BookOpen, FileDown, ArrowRight, CheckCircle } from 'lucide-react';

export default function Phase4Hub() {
  const navigate = useNavigate();

  const features = [
    {
      id: 'test-assembly',
      title: 'Advanced Test Assembly',
      description: 'Constraint-based test construction with intelligent optimization',
      icon: Wand2,
      path: '/test-assembly',
      status: 'complete',
      highlights: [
        'Constraint solver for balanced test creation',
        'Parallel forms generation with Fisher-Yates shuffle',
        'Test length optimizer based on learning hours',
        'Topic, Bloom, and difficulty balancing'
      ]
    },
    {
      id: 'curriculum',
      title: 'Curriculum Standards Integration',
      description: 'Map assessments to educational standards and validate alignment',
      icon: BookOpen,
      path: '/curriculum-standards',
      status: 'complete',
      highlights: [
        'Standards database with national/state/local frameworks',
        'AI-powered standards suggestion',
        'Question-to-standard mapping with strength scoring',
        'Compliance reports and gap analysis'
      ]
    },
    {
      id: 'export',
      title: 'Professional Export & Documentation',
      description: 'Export tests in multiple formats with comprehensive documentation',
      icon: FileDown,
      path: '/professional-export',
      status: 'complete',
      highlights: [
        'PDF export with multiple professional templates',
        'LaTeX generation for academic publishing',
        'Automated assessment reports',
        'Custom watermarks and branding'
      ]
    }
  ];

  return (
    <div className="container mx-auto py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 rounded-full">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-green-700 dark:text-green-400">
            Phase 4: Fully Implemented
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold">
          Professional Features & Integration
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Enterprise-level assessment tools including advanced test assembly, 
          curriculum standards integration, and professional export capabilities
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Card key={feature.id} className="border-2 hover:border-primary/50 transition-all">
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <Badge variant="default" className="bg-green-600">
                  {feature.status}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{feature.title}</CardTitle>
              <CardDescription className="text-base">
                {feature.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {feature.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full" 
                onClick={() => navigate(feature.path)}
              >
                Open {feature.title}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Implementation Summary */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Implementation Highlights</CardTitle>
          <CardDescription>Complete Phase 4 feature set</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Backend Services
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Constraint solver with greedy optimization</li>
                <li>• Parallel forms generator with deterministic shuffling</li>
                <li>• Test balancer for topic, Bloom, and difficulty</li>
                <li>• Length optimizer based on learning hours</li>
                <li>• Standards mapper with AI suggestions</li>
                <li>• Outcome aligner with gap detection</li>
                <li>• LaTeX generator for academic publishing</li>
                <li>• Professional templates (Academic, Corporate, Standardized)</li>
                <li>• Report builder with compliance analysis</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Frontend Components
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Test Assembly Wizard with 3-step configuration</li>
                <li>• Constraint Editor for defining test requirements</li>
                <li>• Assembly Preview with balance metrics</li>
                <li>• Parallel Form Viewer showing version differences</li>
                <li>• Standards Panel for browsing and filtering</li>
                <li>• Outcome Mapper with AI suggestions</li>
                <li>• Compliance Report with gap analysis</li>
                <li>• Export Wizard with format selection</li>
                <li>• Template Selector with customization options</li>
                <li>• LaTeX Preview with copy/download</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Database Integration
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• educational_standards table with RLS policies</li>
              <li>• question_standards mapping table</li>
              <li>• test_assemblies and assembly_versions tables</li>
              <li>• test_assembly_constraints table</li>
              <li>• test_distribution_logs for tracking</li>
              <li>• Full Row Level Security on all tables</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="text-center space-y-4">
        <h3 className="text-2xl font-bold">Ready to explore?</h3>
        <div className="flex justify-center gap-4">
          <Button size="lg" onClick={() => navigate('/test-assembly')}>
            Start Test Assembly
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/curriculum-standards')}>
            Browse Standards
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/professional-export')}>
            Export Tests
          </Button>
        </div>
      </div>
    </div>
  );
}
