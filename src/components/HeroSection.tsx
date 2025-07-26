import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, FileText, Target, Zap } from "lucide-react";
import heroImage from "@/assets/hero-education.jpg";

interface HeroSectionProps {
  onGetStarted?: () => void;
  onLearnMore?: () => void;
}

export const HeroSection = ({ onGetStarted, onLearnMore }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/70" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              AI-Powered{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                Test Generation
              </span>{" "}
              for Educators
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Create comprehensive tests with Table of Specification alignment, 
              AI-generated questions, and instant PDF exports. Transform your 
              assessment workflow today.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="hero" 
              size="lg" 
              onClick={onGetStarted}
              className="text-lg px-8 py-3"
            >
              Get Started Free
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={onLearnMore}
              className="text-lg px-8 py-3"
            >
              Learn More
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            <Card className="p-6 text-center bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-smooth">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">TOS Builder</h3>
              <p className="text-sm text-muted-foreground">
                Automatic calculation and alignment with Bloom's Taxonomy
              </p>
            </Card>

            <Card className="p-6 text-center bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-smooth">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Brain className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-semibold mb-2">AI Questions</h3>
              <p className="text-sm text-muted-foreground">
                Smart generation of questions by topic and difficulty level
              </p>
            </Card>

            <Card className="p-6 text-center bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-smooth">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-accent/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Question Bank</h3>
              <p className="text-sm text-muted-foreground">
                Organize and manage your questions with smart categorization
              </p>
            </Card>

            <Card className="p-6 text-center bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-smooth">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-primary-glow/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary-glow" />
              </div>
              <h3 className="font-semibold mb-2">Instant Export</h3>
              <p className="text-sm text-muted-foreground">
                Generate PDF tests, answer keys, and TOS matrices instantly
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};