-- SGMU - Alerts (SOS e problemas de veículo)
-- Migration: 008_alerts

CREATE TYPE alert_type AS ENUM ('sos', 'vehicle_breakdown', 'other');
CREATE TYPE alert_status AS ENUM ('open', 'resolved');

CREATE TABLE alerts (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id         UUID          REFERENCES trips(id) ON DELETE SET NULL,
  collaborator_id UUID          REFERENCES collaborators(id) ON DELETE SET NULL,
  vehicle_id      UUID          REFERENCES vehicles(id) ON DELETE SET NULL,
  type            alert_type    NOT NULL,
  notes           TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  status          alert_status  NOT NULL DEFAULT 'open',
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_status     ON alerts(status);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_alerts"   ON alerts FOR SELECT USING (true);
CREATE POLICY "public_insert_alerts" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_alerts" ON alerts FOR UPDATE USING (true);
