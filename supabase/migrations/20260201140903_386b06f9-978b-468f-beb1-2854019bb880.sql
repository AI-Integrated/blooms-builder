-- Add institution and avatar_url columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS institution TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.institution IS 'Educational institution name for display on TOS and printed outputs';
COMMENT ON COLUMN public.profiles.avatar_url IS 'Profile picture URL for the user';