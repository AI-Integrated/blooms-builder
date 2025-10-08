-- Phase 4: Professional Features & Integration Database Schema

-- Educational Standards table
CREATE TABLE IF NOT EXISTS public.educational_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'national', 'state', 'local', 'international'
  grade_level TEXT,
  subject_area TEXT NOT NULL,
  framework TEXT, -- e.g., 'Common Core', 'NGSS', 'K to 12'
  parent_standard_id UUID REFERENCES public.educational_standards(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Question-Standards mapping
CREATE TABLE IF NOT EXISTS public.question_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  standard_id UUID REFERENCES public.educational_standards(id) ON DELETE CASCADE,
  alignment_strength NUMERIC CHECK (alignment_strength >= 0 AND alignment_strength <= 1),
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id, standard_id)
);

-- ML Models tracking
CREATE TABLE IF NOT EXISTS public.ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'classification', 'similarity', 'generation'
  accuracy_score NUMERIC,
  f1_score NUMERIC,
  precision_score NUMERIC,
  recall_score NUMERIC,
  training_data_size INTEGER,
  hyperparameters JSONB DEFAULT '{}'::jsonb,
  deployed_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- User Analytics
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- System Metrics
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  metric_category TEXT NOT NULL, -- 'performance', 'usage', 'quality', 'error'
  aggregation_period TEXT, -- 'hourly', 'daily', 'weekly', 'monthly'
  dimensions JSONB DEFAULT '{}'::jsonb,
  measured_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Test Assembly Constraints
CREATE TABLE IF NOT EXISTS public.test_assembly_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID,
  constraint_type TEXT NOT NULL, -- 'topic_coverage', 'difficulty_balance', 'bloom_distribution', 'time_limit', 'point_distribution'
  constraint_config JSONB NOT NULL,
  priority INTEGER DEFAULT 5, -- 1-10, higher = more important
  is_required BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Test Equivalence Groups (for parallel forms)
CREATE TABLE IF NOT EXISTS public.test_equivalence_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  description TEXT,
  target_difficulty NUMERIC,
  target_reliability NUMERIC,
  statistical_metrics JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Test Equivalence Memberships
CREATE TABLE IF NOT EXISTS public.test_equivalence_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.test_equivalence_groups(id) ON DELETE CASCADE,
  test_id UUID REFERENCES public.generated_tests(id) ON DELETE CASCADE,
  equivalence_score NUMERIC, -- How equivalent this test is to the group
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, test_id)
);

-- Enable RLS on all tables
ALTER TABLE public.educational_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_assembly_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_equivalence_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_equivalence_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Educational Standards
CREATE POLICY "Educational standards are viewable by all authenticated users"
  ON public.educational_standards FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage educational standards"
  ON public.educational_standards FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for Question Standards
CREATE POLICY "Question standards are viewable by all authenticated users"
  ON public.question_standards FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create question standards mappings"
  ON public.question_standards FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own question standards mappings"
  ON public.question_standards FOR UPDATE
  USING (validated_by = auth.uid() OR validated_by IS NULL);

-- RLS Policies for ML Models
CREATE POLICY "ML models are viewable by authenticated users"
  ON public.ml_models FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage ML models"
  ON public.ml_models FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for User Analytics
CREATE POLICY "Users can view their own analytics"
  ON public.user_analytics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert analytics"
  ON public.user_analytics FOR INSERT
  WITH CHECK (true);

-- RLS Policies for System Metrics
CREATE POLICY "Authenticated users can view system metrics"
  ON public.system_metrics FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert metrics"
  ON public.system_metrics FOR INSERT
  WITH CHECK (true);

-- RLS Policies for Test Assembly Constraints
CREATE POLICY "Users can view all constraints"
  ON public.test_assembly_constraints FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own constraints"
  ON public.test_assembly_constraints FOR ALL
  USING (created_by = auth.uid());

-- RLS Policies for Test Equivalence Groups
CREATE POLICY "Users can view equivalence groups"
  ON public.test_equivalence_groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own equivalence groups"
  ON public.test_equivalence_groups FOR ALL
  USING (created_by = auth.uid());

-- RLS Policies for Test Equivalence Members
CREATE POLICY "Users can view equivalence memberships"
  ON public.test_equivalence_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage equivalence memberships"
  ON public.test_equivalence_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.test_equivalence_groups g
    WHERE g.id = test_equivalence_members.group_id 
    AND g.created_by = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_question_standards_question ON public.question_standards(question_id);
CREATE INDEX idx_question_standards_standard ON public.question_standards(standard_id);
CREATE INDEX idx_educational_standards_category ON public.educational_standards(category);
CREATE INDEX idx_educational_standards_subject ON public.educational_standards(subject_area);
CREATE INDEX idx_ml_models_active ON public.ml_models(is_active) WHERE is_active = true;
CREATE INDEX idx_user_analytics_user_event ON public.user_analytics(user_id, event_type);
CREATE INDEX idx_system_metrics_category ON public.system_metrics(metric_category, measured_at);
CREATE INDEX idx_test_assembly_constraints_test ON public.test_assembly_constraints(test_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_educational_standards_updated_at
  BEFORE UPDATE ON public.educational_standards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ml_models_updated_at
  BEFORE UPDATE ON public.ml_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();