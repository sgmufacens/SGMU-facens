-- FleetControl - Add origin_branch_id to trips
-- Migration: 006_trips_origin_branch
-- Adds origin_branch_id to trips table (was only in schedules)

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS origin_branch_id UUID REFERENCES branches(id);
