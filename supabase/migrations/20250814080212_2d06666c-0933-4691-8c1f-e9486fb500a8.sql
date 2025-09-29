-- Create profiles table (mirror of auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin','teacher')) NOT NULL DEFAULT 'teacher',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Update existing tos_entries table to match schema
ALTER TABLE public.tos_entries 
ADD COLUMN IF NOT EXISTS owner UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS topics JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS blooms_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS matrix JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS period TEXT;

-- Update existing questions table to match schema  
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS tos_id UUID REFERENCES public.tos_entries(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('mcq','tf','fib','essay')) DEFAULT 'mcq',
ADD COLUMN IF NOT EXISTS choices JSONB,
ADD COLUMN IF NOT EXISTS correct_answer TEXT,
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS confidence NUMERIC,
ADD COLUMN IF NOT EXISTS used_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create generated_tests table
CREATE TABLE public.generated_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tos_id UUID REFERENCES public.tos_entries(id) ON DELETE CASCADE,
  version_label TEXT DEFAULT 'A',
  items JSONB NOT NULL,
  answer_key JSONB NOT NULL,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_tests ENABLE ROW LEVEL SECURITY;

-- Create rubrics table
CREATE TABLE public.rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL,
  owner UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;

-- Create question_rubrics junction table
CREATE TABLE public.question_rubrics (
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  rubric_id UUID REFERENCES public.rubrics(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, rubric_id)
);

-- Enable RLS
ALTER TABLE public.question_rubrics ENABLE ROW LEVEL SECURITY;

-- Create shares table for collaboration
CREATE TABLE public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  collaborator UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('viewer', 'editor', 'owner')) DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Create essay_grades table for rubric scoring
CREATE TABLE public.essay_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  rubric_id UUID REFERENCES public.rubrics(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  scores JSONB NOT NULL, -- {criteria_id: score}
  total_score NUMERIC NOT NULL,
  graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.essay_grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for tos_entries  
CREATE POLICY "Teachers can view own TOS entries" ON public.tos_entries FOR SELECT USING (owner = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Teachers can create TOS entries" ON public.tos_entries FOR INSERT WITH CHECK (owner = auth.uid());
CREATE POLICY "Teachers can update own TOS entries" ON public.tos_entries FOR UPDATE USING (owner = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Teachers can delete own TOS entries" ON public.tos_entries FOR DELETE USING (owner = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for questions
CREATE POLICY "Users can view approved questions or own questions" ON public.questions FOR SELECT USING (approved = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Teachers can create questions" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update questions, teachers can update own" ON public.questions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR created_by = 'teacher');
CREATE POLICY "Admins can delete questions" ON public.questions FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for generated_tests
CREATE POLICY "Users can view generated tests" ON public.generated_tests FOR SELECT USING (true);
CREATE POLICY "Users can create generated tests" ON public.generated_tests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update generated tests" ON public.generated_tests FOR UPDATE USING (true);
CREATE POLICY "Users can delete generated tests" ON public.generated_tests FOR DELETE USING (true);

-- RLS Policies for rubrics
CREATE POLICY "Users can view all rubrics" ON public.rubrics FOR SELECT USING (true);
CREATE POLICY "Users can create rubrics" ON public.rubrics FOR INSERT WITH CHECK (owner = auth.uid());
CREATE POLICY "Users can update own rubrics" ON public.rubrics FOR UPDATE USING (owner = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can delete own rubrics" ON public.rubrics FOR DELETE USING (owner = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for question_rubrics
CREATE POLICY "Users can view question rubrics" ON public.question_rubrics FOR SELECT USING (true);
CREATE POLICY "Users can create question rubrics" ON public.question_rubrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update question rubrics" ON public.question_rubrics FOR UPDATE USING (true);
CREATE POLICY "Users can delete question rubrics" ON public.question_rubrics FOR DELETE USING (true);

-- RLS Policies for shares
CREATE POLICY "Users can view shares they're involved in" ON public.shares FOR SELECT USING (collaborator = auth.uid());
CREATE POLICY "Users can create shares" ON public.shares FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update shares they own" ON public.shares FOR UPDATE USING (collaborator = auth.uid());
CREATE POLICY "Users can delete shares they own" ON public.shares FOR DELETE USING (collaborator = auth.uid());

-- RLS Policies for essay_grades
CREATE POLICY "Users can view essay grades" ON public.essay_grades FOR SELECT USING (true);
CREATE POLICY "Users can create essay grades" ON public.essay_grades FOR INSERT WITH CHECK (graded_by = auth.uid());
CREATE POLICY "Users can update essay grades they created" ON public.essay_grades FOR UPDATE USING (graded_by = auth.uid());
CREATE POLICY "Users can delete essay grades they created" ON public.essay_grades FOR DELETE USING (graded_by = auth.uid());

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.email = 'demonstration595@gmail.com' THEN 'admin'
      ELSE 'teacher'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to approve AI questions (admin only)
CREATE OR REPLACE FUNCTION public.approve_question(question_id UUID, approve BOOLEAN)
RETURNS VOID AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve questions';
  END IF;
  
  UPDATE public.questions 
  SET approved = approve,
      approved_by = auth.uid()::text,
      updated_at = now()
  WHERE id = question_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;