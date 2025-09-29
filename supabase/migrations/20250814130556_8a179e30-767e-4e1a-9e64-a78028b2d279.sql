-- Fix security warnings by setting search_path for functions

-- Fix function search path for handle_new_user_profile
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;

-- Fix function search path for get_user_question_stats
CREATE OR REPLACE FUNCTION public.get_user_question_stats(user_uuid UUID)
RETURNS TABLE (
  bloom_level TEXT,
  difficulty TEXT,
  knowledge_dimension TEXT,
  count BIGINT,
  approved_count BIGINT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;

-- Fix other existing functions
CREATE OR REPLACE FUNCTION public.update_test_metadata_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'teacher'::user_role
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_admin_role(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the user's role to admin if they match the admin email
  UPDATE profiles 
  SET role = 'admin'
  WHERE email = user_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_demo_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the demo admin user
  IF NEW.email = 'demonstration595@gmial.com' THEN
    -- Insert profile with admin role
    INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      'Demo',
      'Administrator',
      'admin'
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      first_name = 'Demo',
      last_name = 'Administrator';
  END IF;
  
  RETURN NEW;
END;
$$;