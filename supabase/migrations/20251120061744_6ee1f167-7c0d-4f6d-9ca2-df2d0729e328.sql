-- Migration: Fix TOS schema and add bloom_distribution column
-- This migration ensures the tos_entries table has all required columns for test generation

-- First, check if tos_entries table exists and add missing columns
DO $$ 
BEGIN
  -- Add bloom_distribution column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'bloom_distribution'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN bloom_distribution jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Ensure all other required columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'subject_no'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN subject_no text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'course'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN course text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'year_section'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN year_section text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'exam_period'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN exam_period text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'school_year'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN school_year text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'total_items'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN total_items integer NOT NULL DEFAULT 50;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'prepared_by'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN prepared_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'noted_by'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN noted_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'matrix'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN matrix jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'distribution'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN distribution jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN created_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tos_entries' 
    AND column_name = 'owner'
  ) THEN
    ALTER TABLE public.tos_entries 
    ADD COLUMN owner uuid REFERENCES public.profiles(id);
  END IF;
END $$;

-- Add index on bloom_distribution for faster queries
CREATE INDEX IF NOT EXISTS idx_tos_entries_bloom_distribution 
ON public.tos_entries USING gin (bloom_distribution);

-- Add index on owner for filtering
CREATE INDEX IF NOT EXISTS idx_tos_entries_owner 
ON public.tos_entries(owner);

-- Update RLS policies for tos_entries if they don't exist
DO $$
BEGIN
  -- Policy for reading own TOS entries
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tos_entries' 
    AND policyname = 'Users can read their own TOS entries'
  ) THEN
    CREATE POLICY "Users can read their own TOS entries"
    ON public.tos_entries
    FOR SELECT
    TO authenticated
    USING (owner = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;

  -- Policy for creating TOS entries
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tos_entries' 
    AND policyname = 'Teachers can create TOS entries'
  ) THEN
    CREATE POLICY "Teachers can create TOS entries"
    ON public.tos_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (
      owner = auth.uid() AND 
      (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'))
    );
  END IF;

  -- Policy for updating own TOS entries
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tos_entries' 
    AND policyname = 'Users can update their own TOS entries'
  ) THEN
    CREATE POLICY "Users can update their own TOS entries"
    ON public.tos_entries
    FOR UPDATE
    TO authenticated
    USING (owner = auth.uid())
    WITH CHECK (owner = auth.uid());
  END IF;

  -- Policy for deleting own TOS entries
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tos_entries' 
    AND policyname = 'Users can delete their own TOS entries'
  ) THEN
    CREATE POLICY "Users can delete their own TOS entries"
    ON public.tos_entries
    FOR DELETE
    TO authenticated
    USING (owner = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
END $$;