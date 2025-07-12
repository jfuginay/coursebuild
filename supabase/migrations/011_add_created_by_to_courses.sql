-- Migration: Add created_by field to courses table
-- This enables tracking of course creators using the profiles.id (UUID)

-- Add created_by column to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);