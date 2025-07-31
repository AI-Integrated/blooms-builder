import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, FileText, Target, Zap, Sparkles, Clock, Database, Download } from "lucide-react";
import heroImage from "@/assets/hero-education.jpg";

interface HeroSectionProps {
  onGetStarted?: () => void;
  onLearnMore?: () => void;
}

export const HeroSection = ({ onGetStarted, onLearnMore }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Educational background" 
          className="w-full h-full object-cover opacity-30 animate-fade-in-scale"
        />
        <div className="absolute inset-0 bg-gradient-hero"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-2xl animate-float stagger-2"></div>
        <div className="absolute top-1/3 right-1/3 w-32 h-32 bg-accent/10 rounded-full blur-xl animate-float stagger-3"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container-custom text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 mb-8 animate-slide-in-down">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-foreground font-medium">AI-Powered Assessment Creation</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 animate-slide-in-up">
          <span className="block text-foreground leading-tight">Transform Your</span>
          <span className="block text-shimmer leading-tight">Teaching Experience</span>
        </h1>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed animate-slide-in-up stagger-1">
          Create comprehensive assessments aligned with Bloom's Taxonomy using advanced AI. 
          Build smarter tests that truly measure student understanding.
        </p>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 mb-12 animate-slide-in-up stagger-2">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">10x</div>
            <div className="text-sm text-muted-foreground">Faster Creation</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-secondary">500+</div>
            <div className="text-sm text-muted-foreground">Question Types</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-accent">100%</div>
            <div className="text-sm text-muted-foreground">Bloom's Aligned</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20 animate-slide-in-up stagger-3">
          <Button 
            size="lg" 
            onClick={onGetStarted}
            className="text-lg px-10 py-6 bg-gradient-primary hover:shadow-glow btn-hover interactive focus-ring"
          >
            <Target className="w-5 h-5 mr-2" />
            Start Building Tests
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={onLearnMore}
            className="text-lg px-10 py-6 border-2 hover:bg-primary/10 focus-ring interactive"
          >
            <Clock className="w-5 h-5 mr-2" />
            Watch Demo
          </Button>
        </div>

        {/* Enhanced Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <Card className="bg-card/80 backdrop-blur-sm border border-border/50 card-hover animate-slide-in-up stagger-1">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-card">
                <Target className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">TOS Builder</h3>
              <p className="text-muted-foreground leading-relaxed">Create detailed Table of Specifications with AI-powered curriculum alignment</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border border-border/50 card-hover animate-slide-in-up stagger-2">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-card">
                <Brain className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">AI Questions</h3>
              <p className="text-muted-foreground leading-relaxed">Generate intelligent questions using advanced natural language processing</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border border-border/50 card-hover animate-slide-in-up stagger-3">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-accent to-accent/80 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-card">
                <Database className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">Question Bank</h3>
              <p className="text-muted-foreground leading-relaxed">Organize and manage your question library with smart categorization</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border border-border/50 card-hover animate-slide-in-up stagger-4">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-card">
                <Download className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">Instant Export</h3>
              <p className="text-muted-foreground leading-relaxed">Export your tests in multiple formats ready for immediate distribution</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};