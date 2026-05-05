-- SGMU - Route Points
-- Migration: 007_route_points

CREATE TABLE route_points (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id     UUID          NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_route_points_trip_id    ON route_points(trip_id);
CREATE INDEX idx_route_points_recorded_at ON route_points(recorded_at);

ALTER TABLE route_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_route_points"   ON route_points FOR SELECT USING (true);
CREATE POLICY "public_insert_route_points" ON route_points FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete_route_points" ON route_points FOR DELETE USING (true);
