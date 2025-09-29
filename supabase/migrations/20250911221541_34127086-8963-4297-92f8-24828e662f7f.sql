-- Add version columns to generated_tests table
ALTER TABLE generated_tests 
ADD COLUMN version_label text DEFAULT 'A',
ADD COLUMN version_number integer DEFAULT 1;