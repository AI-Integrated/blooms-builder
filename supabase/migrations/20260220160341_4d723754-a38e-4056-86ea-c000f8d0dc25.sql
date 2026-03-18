
-- Create system_settings table for persistent admin configuration
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read all settings
CREATE POLICY "Admins can read settings"
ON public.system_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.system_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update settings
CREATE POLICY "Admins can update settings"
ON public.system_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read settings (for system-wide config that affects behavior)
CREATE POLICY "Authenticated users can read settings"
ON public.system_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Seed default settings
INSERT INTO public.system_settings (key, value) VALUES
  ('health_alerts_enabled', 'true'::jsonb);
