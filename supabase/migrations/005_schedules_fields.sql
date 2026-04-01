-- FleetControl - Schedules extra fields
-- Migration: 005_schedules_fields
-- Adds origin_branch_id and destination_description to schedules

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS origin_branch_id UUID REFERENCES branches(id),
  ADD COLUMN IF NOT EXISTS destination_description TEXT;
