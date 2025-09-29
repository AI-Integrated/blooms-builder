-- Create exports storage bucket for PDF uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exports', 'exports', true);

-- Create RLS policies for exports bucket
CREATE POLICY "Allow authenticated users to upload exports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'exports' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated users to view exports" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'exports' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow users to update their own exports" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'exports' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow users to delete their own exports" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'exports' 
  AND auth.uid() IS NOT NULL
);