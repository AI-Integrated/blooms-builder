-- Enhanced database schema for complete educational platform

-- User profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'teacher')) NOT NULL DEFAULT 'teacher',
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Enhanced TOS entries table
ALTER TABLE public.tos_entries ADD COLUMN IF NOT EXISTS owner UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tos_entries ADD COLUMN IF NOT EXISTS topics JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tos_entries ADD COLUMN IF NOT EXISTS distribution JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.tos_entries ADD COLUMN IF NOT EXISTS matrix JSONB DEFAULT '{}'::jsonb;

-- Enhanced questions table
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS owner UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 0.7;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS used_history JSONB DEFAULT '[]'::jsonb;

-- Enhanced generated tests table
ALTER TABLE public.generated_tests ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.generated_tests ADD COLUMN IF NOT EXISTS versions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.generated_tests ADD COLUMN IF NOT EXISTS version_count INTEGER DEFAULT 1;
ALTER TABLE public.generated_tests ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- TOS collaborators table
CREATE TABLE IF NOT EXISTS public.tos_collaborators (
  tos_id UUID REFERENCES public.tos_entries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT TRUE,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (tos_id, user_id)
);

-- Enable RLS on tos_collaborators
ALTER TABLE public.tos_collaborators ENABLE ROW LEVEL SECURITY;

-- Essay scores table
CREATE TABLE IF NOT EXISTS public.essay_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT,
  scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC DEFAULT 0,
  graded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on essay_scores
ALTER TABLE public.essay_scores ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for enhanced security
DROP POLICY IF EXISTS "TOS entries are viewable by everyone" ON public.tos_entries;
DROP POLICY IF EXISTS "TOS entries can be created by everyone" ON public.tos_entries;
DROP POLICY IF EXISTS "TOS entries can be updated by everyone" ON public.tos_entries;
DROP POLICY IF EXISTS "TOS entries can be deleted by everyone" ON public.tos_entries;

CREATE POLICY "Users can view own TOS or shared TOS" ON public.tos_entries 
FOR SELECT USING (
  auth.uid() = owner OR 
  EXISTS (SELECT 1 FROM public.tos_collaborators c WHERE c.tos_id = id AND c.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "Users can create own TOS" ON public.tos_entries 
FOR INSERT WITH CHECK (auth.uid() = owner);

CREATE POLICY "Users can update own TOS or shared TOS" ON public.tos_entries 
FOR UPDATE USING (
  auth.uid() = owner OR 
  EXISTS (SELECT 1 FROM public.tos_collaborators c WHERE c.tos_id = id AND c.user_id = auth.uid() AND c.can_edit = true)
);

CREATE POLICY "Users can delete own TOS" ON public.tos_entries 
FOR DELETE USING (auth.uid() = owner);

-- Update questions RLS policies
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Questions can be created by everyone" ON public.questions;
DROP POLICY IF EXISTS "Questions can be updated by everyone" ON public.questions;
DROP POLICY IF EXISTS "Questions can be deleted by everyone" ON public.questions;

CREATE POLICY "Users can view own questions or admin can view all" ON public.questions 
FOR SELECT USING (
  auth.uid() = owner OR 
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "Users can create own questions" ON public.questions 
FOR INSERT WITH CHECK (auth.uid() = owner);

CREATE POLICY "Users can update own questions or admin can update all" ON public.questions 
FOR UPDATE USING (
  auth.uid() = owner OR 
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "Users can delete own questions" ON public.questions 
FOR DELETE USING (auth.uid() = owner);

-- Update generated tests RLS policies
DROP POLICY IF EXISTS "Users can view generated tests" ON public.generated_tests;
DROP POLICY IF EXISTS "Users can create generated tests" ON public.generated_tests;
DROP POLICY IF EXISTS "Users can update generated tests" ON public.generated_tests;
DROP POLICY IF EXISTS "Users can delete generated tests" ON public.generated_tests;

CREATE POLICY "Users can view own tests" ON public.generated_tests 
FOR SELECT USING (
  auth.uid() = created_by OR 
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "Users can create own tests" ON public.generated_tests 
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own tests" ON public.generated_tests 
FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own tests" ON public.generated_tests 
FOR DELETE USING (auth.uid() = created_by);

-- Policies for new tables
CREATE POLICY "Users can view collaborations they're part of" ON public.tos_collaborators 
FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.tos_entries t WHERE t.id = tos_id AND t.owner = auth.uid())
);

CREATE POLICY "TOS owners can add collaborators" ON public.tos_collaborators 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tos_entries t WHERE t.id = tos_id AND t.owner = auth.uid())
);

CREATE POLICY "Users can view own essay scores" ON public.essay_scores 
FOR SELECT USING (auth.uid() = graded_by);

CREATE POLICY "Users can create essay scores" ON public.essay_scores 
FOR INSERT WITH CHECK (auth.uid() = graded_by);

CREATE POLICY "Users can update own essay scores" ON public.essay_scores 
FOR UPDATE USING (auth.uid() = graded_by);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'teacher'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Analytics helper functions
CREATE OR REPLACE FUNCTION public.get_user_question_stats(user_uuid UUID)
RETURNS TABLE (
  bloom_level TEXT,
  difficulty TEXT,
  knowledge_dimension TEXT,
  count BIGINT,
  approved_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.bloom_level,
    q.difficulty,
    q.knowledge_dimension,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE q.approved = true) as approved_count
  FROM public.questions q
  WHERE q.owner = user_uuid
  GROUP BY q.bloom_level, q.difficulty, q.knowledge_dimension
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tos_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generated_tests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tos_collaborators;