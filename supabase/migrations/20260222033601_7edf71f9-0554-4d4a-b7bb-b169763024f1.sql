-- Fix: Make exports storage bucket private to prevent unauthenticated access
UPDATE storage.buckets SET public = false WHERE id = 'exports';