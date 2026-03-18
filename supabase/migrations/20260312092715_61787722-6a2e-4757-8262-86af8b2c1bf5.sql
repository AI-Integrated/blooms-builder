
-- Academic hierarchy tables for dynamic filter management

-- Categories table (e.g., Major, GE)
CREATE TABLE public.academic_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Specializations table (e.g., IT, CS, Math)
CREATE TABLE public.academic_specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.academic_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Subjects table (code + description)
CREATE TABLE public.academic_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialization_id uuid NOT NULL REFERENCES public.academic_specializations(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text NOT NULL,
  deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(specialization_id, code)
);

-- Enable RLS
ALTER TABLE public.academic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone authenticated can read
CREATE POLICY "Authenticated users can read categories"
  ON public.academic_categories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read specializations"
  ON public.academic_specializations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read subjects"
  ON public.academic_subjects FOR SELECT TO authenticated
  USING (true);

-- RLS: Only admins can insert/update/delete
CREATE POLICY "Admins can insert categories"
  ON public.academic_categories FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update categories"
  ON public.academic_categories FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete categories"
  ON public.academic_categories FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert specializations"
  ON public.academic_specializations FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update specializations"
  ON public.academic_specializations FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete specializations"
  ON public.academic_specializations FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert subjects"
  ON public.academic_subjects FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update subjects"
  ON public.academic_subjects FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete subjects"
  ON public.academic_subjects FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed data from existing static config
INSERT INTO public.academic_categories (name) VALUES ('Major'), ('GE');

-- Major specializations
WITH cat AS (SELECT id FROM public.academic_categories WHERE name = 'Major')
INSERT INTO public.academic_specializations (category_id, name)
SELECT cat.id, s.name FROM cat, (VALUES ('IT'), ('IS'), ('CS'), ('EMC')) AS s(name);

-- GE specializations
WITH cat AS (SELECT id FROM public.academic_categories WHERE name = 'GE')
INSERT INTO public.academic_specializations (category_id, name)
SELECT cat.id, s.name FROM cat, (VALUES ('Math'), ('P.E.'), ('English'), ('Filipino'), ('Science'), ('Social Science')) AS s(name);

-- IT subjects
WITH spec AS (
  SELECT s.id FROM public.academic_specializations s
  JOIN public.academic_categories c ON c.id = s.category_id
  WHERE c.name = 'Major' AND s.name = 'IT'
)
INSERT INTO public.academic_subjects (specialization_id, code, description)
SELECT spec.id, v.code, v.description FROM spec, (VALUES
  ('101', 'Introduction to Computing'),
  ('102', 'Computer Programming 1'),
  ('103', 'Computer Programming 2'),
  ('104', 'Data Structures and Algorithms'),
  ('105', 'Discrete Mathematics'),
  ('106', 'Web Development'),
  ('107', 'Database Management Systems'),
  ('108', 'Networking Fundamentals'),
  ('109', 'Systems Administration'),
  ('110', 'Information Assurance and Security')
) AS v(code, description);

-- IS subjects
WITH spec AS (
  SELECT s.id FROM public.academic_specializations s
  JOIN public.academic_categories c ON c.id = s.category_id
  WHERE c.name = 'Major' AND s.name = 'IS'
)
INSERT INTO public.academic_subjects (specialization_id, code, description)
SELECT spec.id, v.code, v.description FROM spec, (VALUES
  ('101', 'Fundamentals of Information Systems'),
  ('102', 'Systems Analysis and Design'),
  ('103', 'Business Process Management'),
  ('104', 'Enterprise Architecture'),
  ('105', 'IS Project Management'),
  ('106', 'IT Infrastructure')
) AS v(code, description);

-- CS subjects
WITH spec AS (
  SELECT s.id FROM public.academic_specializations s
  JOIN public.academic_categories c ON c.id = s.category_id
  WHERE c.name = 'Major' AND s.name = 'CS'
)
INSERT INTO public.academic_subjects (specialization_id, code, description)
SELECT spec.id, v.code, v.description FROM spec, (VALUES
  ('101', 'Introduction to Computer Science'),
  ('102', 'Object-Oriented Programming'),
  ('103', 'Operating Systems'),
  ('104', 'Theory of Computation'),
  ('105', 'Artificial Intelligence'),
  ('106', 'Software Engineering')
) AS v(code, description);

-- EMC subjects
WITH spec AS (
  SELECT s.id FROM public.academic_specializations s
  JOIN public.academic_categories c ON c.id = s.category_id
  WHERE c.name = 'Major' AND s.name = 'EMC'
)
INSERT INTO public.academic_subjects (specialization_id, code, description)
SELECT spec.id, v.code, v.description FROM spec, (VALUES
  ('101', 'Entertainment and Multimedia Computing Fundamentals'),
  ('102', 'Digital Media Arts'),
  ('103', 'Game Development'),
  ('104', 'Animation and Motion Graphics')
) AS v(code, description);

-- Math subjects
WITH spec AS (
  SELECT s.id FROM public.academic_specializations s
  JOIN public.academic_categories c ON c.id = s.category_id
  WHERE c.name = 'GE' AND s.name = 'Math'
)
INSERT INTO public.academic_subjects (specialization_id, code, description)
SELECT spec.id, v.code, v.description FROM spec, (VALUES
  ('101', 'Mathematics in the Modern World'),
  ('102', 'Calculus 1'),
  ('103', 'Calculus 2'),
  ('104', 'Linear Algebra'),
  ('105', 'Statistics and Probability')
) AS v(code, description);

-- P.E. subjects
WITH spec AS (
  SELECT s.id FROM public.academic_specializations s
  JOIN public.academic_categories c ON c.id = s.category_id
  WHERE c.name = 'GE' AND s.name = 'P.E.'
)
INSERT INTO public.academic_subjects (specialization_id, code, description)
SELECT spec.id, v.code, v.description FROM spec, (VALUES
  ('101', 'Physical Fitness and Wellness'),
  ('102', 'Rhythmic Activities'),
  ('103', 'Team Sports'),
  ('104', 'Individual and Dual Sports')
) AS v(code, description);

-- English subjects
WITH spec AS (
  SELECT s.id FROM public.academic_specializations s
  JOIN public.academic_categories c ON c.id = s.category_id
  WHERE c.name = 'GE' AND s.name = 'English'
)
INSERT INTO public.academic_subjects (specialization_id, code, description)
SELECT spec.id, v.code, v.description FROM spec, (VALUES
  ('101', 'Purposive Communication'),
  ('102', 'Readings in Philippine History'),
  ('103', 'Technical Writing'),
  ('104', 'World Literature')
) AS v(code, description);

-- Filipino subjects
WITH spec AS (
  SELECT s.id FROM public.academic_specializations s
  JOIN public.academic_categories c ON c.id = s.category_id
  WHERE c.name = 'GE' AND s.name = 'Filipino'
)
INSERT INTO public.academic_subjects (specialization_id, code, description)
SELECT spec.id, v.code, v.description FROM spec, (VALUES
  ('101', 'Kontekstuwalisadong Komunikasyon sa Filipino'),
  ('102', 'Pagbasa at Pagsulat Tungo sa Pananaliksik'),
  ('103', 'Masining na Pagpapahayag')
) AS v(code, description);

-- Science subjects
WITH spec AS (
  SELECT s.id FROM public.academic_specializations s
  JOIN public.academic_categories c ON c.id = s.category_id
  WHERE c.name = 'GE' AND s.name = 'Science'
)
INSERT INTO public.academic_subjects (specialization_id, code, description)
SELECT spec.id, v.code, v.description FROM spec, (VALUES
  ('101', 'Science, Technology, and Society'),
  ('102', 'The Contemporary World')
) AS v(code, description);

-- Social Science subjects
WITH spec AS (
  SELECT s.id FROM public.academic_specializations s
  JOIN public.academic_categories c ON c.id = s.category_id
  WHERE c.name = 'GE' AND s.name = 'Social Science'
)
INSERT INTO public.academic_subjects (specialization_id, code, description)
SELECT spec.id, v.code, v.description FROM spec, (VALUES
  ('101', 'Understanding the Self'),
  ('102', 'Ethics'),
  ('103', 'Life and Works of Rizal')
) AS v(code, description);
