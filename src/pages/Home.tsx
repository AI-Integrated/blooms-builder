import { useNavigate } from "react-router-dom";
import { HeroSection } from "@/components/HeroSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Shield, Users, BarChart3, BookOpen, Zap } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const detailedFeatures = [
    {
      icon: BookOpen,
      title: "Table of Specifications Builder",
      description: "Create comprehensive TOS matrices aligned with curriculum standards",
      benefits: [
        "Map learning objectives to assessment items",
        "Ensure balanced coverage across Bloom's taxonomy levels",
        "Validate content alignment with educational standards",
        "Track cognitive complexity distribution"
      ],
      action: () => navigate('/test-assembly')
    },
    {
      icon: Zap,
      title: "AI-Powered Question Generation",
      description: "Generate high-quality questions using advanced AI technology",
      benefits: [
        "Automatically create questions from learning objectives",
        "Generate appropriate distractors for multiple-choice items",
        "Ensure taxonomic accuracy with semantic analysis",
        "Produce diverse question types and formats"
      ],
      action: () => navigate('/curriculum-standards')
    },
    {
      icon: Shield,
      title: "Secure Multi-Version Tests",
      description: "Create multiple equivalent test versions with built-in security",
      benefits: [
        "Generate parallel forms with balanced difficulty",
        "Embed unique watermarks for tracking",
        "Randomize question and choice order securely",
        "Maintain psychometric equivalence across versions"
      ],
      action: () => navigate('/professional-export')
    },
    {
      icon: BarChart3,
      title: "Psychometric Analytics",
      description: "Comprehensive test and item analysis with actionable insights",
      benefits: [
        "Calculate reliability coefficients (KR-20, Cronbach's Alpha)",
        "Analyze item difficulty and discrimination indices",
        "Identify problematic items for revision",
        "Generate detailed assessment reports"
      ],
      action: () => navigate('/psychometrics')
    },
    {
      icon: Users,
      title: "Collaborative Workflow",
      description: "Work together with your team in real-time",
      benefits: [
        "Share question banks across departments",
        "Review and approve items collaboratively",
        "Track changes and version history",
        "Assign roles and permissions"
      ],
      action: () => navigate('/enhanced-dashboard')
    },
    {
      icon: CheckCircle2,
      title: "Quality Assurance",
      description: "Automated validation and quality control systems",
      benefits: [
        "Detect duplicate or redundant questions",
        "Validate alignment with objectives",
        "Check for bias and accessibility issues",
        "Ensure compliance with testing standards"
      ],
      action: () => navigate('/quality')
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <HeroSection 
        onGetStarted={() => navigate("/login")}
        onLearnMore={() => {
          document.getElementById('features-detail')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Detailed Features Section */}
      <section id="features-detail" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Professional Assessment
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Comprehensive tools designed for educators who demand excellence in assessment creation, 
              validation, and analysis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {detailedFeatures.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                      <p className="text-sm text-muted-foreground font-normal">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  {feature.action && (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={feature.action}
                    >
                      Explore Feature
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Educators Choose AI Test Bank
            </h2>
            <p className="text-xl text-muted-foreground">
              Built by educators, for educators
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-primary mb-2">10x</div>
                <div className="text-lg font-semibold mb-2">Faster Creation</div>
                <p className="text-sm text-muted-foreground">
                  Reduce test creation time from hours to minutes with AI assistance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-primary mb-2">100%</div>
                <div className="text-lg font-semibold mb-2">Alignment</div>
                <p className="text-sm text-muted-foreground">
                  Ensure perfect alignment with curriculum standards and learning objectives
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-primary mb-2">50+</div>
                <div className="text-lg font-semibold mb-2">Quality Checks</div>
                <p className="text-sm text-muted-foreground">
                  Automated validation ensures every question meets professional standards
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
