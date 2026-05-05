-- SGMU - Add phone to collaborators
-- Migration: 009_collaborator_phone

ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS phone TEXT;
