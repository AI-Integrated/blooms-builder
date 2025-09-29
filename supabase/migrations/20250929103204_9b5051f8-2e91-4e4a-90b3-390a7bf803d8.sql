-- Create quality assessments table
CREATE TABLE public.quality_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  overall_score NUMERIC NOT NULL DEFAULT 0,
  characteristics JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations TEXT[] DEFAULT '{}',
  compliance_level TEXT NOT NULL DEFAULT 'minimal',
  assessment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_review_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  assessed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create performance benchmarks table  
CREATE TABLE public.performance_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_name TEXT NOT NULL,
  average_response_time NUMERIC NOT NULL,
  min_response_time NUMERIC NOT NULL,
  max_response_time NUMERIC NOT NULL,
  throughput NUMERIC NOT NULL DEFAULT 0,
  error_rate NUMERIC NOT NULL DEFAULT 0,
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  measurement_period_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create psychometric analyses table
CREATE TABLE public.psychometric_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID,
  question_id UUID,
  analysis_type TEXT NOT NULL,
  difficulty_index NUMERIC,
  discrimination_index NUMERIC,
  point_biserial_correlation NUMERIC,
  reliability_coefficient NUMERIC,
  validity_score NUMERIC,
  sample_size INTEGER,
  analysis_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analyzed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create validation tests table
CREATE TABLE public.validation_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  passed BOOLEAN DEFAULT NULL,
  error_message TEXT,
  execution_time_ms INTEGER,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.quality_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_benchmarks ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.psychometric_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_tests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Quality assessments are viewable by authenticated users" 
ON public.quality_assessments FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create quality assessments" 
ON public.quality_assessments FOR INSERT 
WITH CHECK (auth.uid() = assessed_by OR assessed_by IS NULL);

CREATE POLICY "Performance benchmarks are viewable by authenticated users" 
ON public.performance_benchmarks FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert performance benchmarks" 
ON public.performance_benchmarks FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Psychometric analyses are viewable by authenticated users" 
ON public.psychometric_analyses FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create psychometric analyses" 
ON public.psychometric_analyses FOR INSERT 
WITH CHECK (auth.uid() = analyzed_by OR analyzed_by IS NULL);

CREATE POLICY "Validation tests are viewable by authenticated users" 
ON public.validation_tests FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage validation tests" 
ON public.validation_tests FOR ALL 
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_quality_assessments_updated_at
  BEFORE UPDATE ON public.quality_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();