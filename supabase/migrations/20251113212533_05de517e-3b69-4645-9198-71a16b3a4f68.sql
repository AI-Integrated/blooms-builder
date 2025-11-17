-- Fix RLS policies for quality_metrics and system_metrics tables
-- These tables need to allow system operations for automated metrics collection

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "System can create metrics" ON public.system_metrics;
DROP POLICY IF EXISTS "Teachers and admins can create metrics" ON public.quality_metrics;

-- Create new policies that allow authenticated users to insert metrics
-- This is necessary for automated metrics collection from the frontend

CREATE POLICY "Authenticated users can create system metrics"
ON public.system_metrics
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can create quality metrics"
ON public.quality_metrics
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Note: Read policies remain restricted to admins for security
-- Only admins should be able to view aggregated system and quality metrics