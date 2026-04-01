-- FleetControl - Initial Schema
-- Migration: 001_initial_schema
-- Created: 2026-03-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BRANCHES (Filiais)
-- ============================================================
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COLLABORATORS (Colaboradores)
-- ============================================================
CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  badge_number TEXT UNIQUE NOT NULL,
  branch_id UUID REFERENCES branches(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VEHICLES (Veículos)
-- ============================================================
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  brand TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT,
  branch_id UUID REFERENCES branches(id),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIPS (Registros de Uso)
-- ============================================================
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  collaborator_id UUID NOT NULL REFERENCES collaborators(id),
  destination_branch_id UUID REFERENCES branches(id),
  destination_description TEXT,

  -- Saída
  km_departure INTEGER NOT NULL,
  departed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  photos_departure TEXT[] DEFAULT '{}',
  notes_departure TEXT,

  -- Chegada
  km_arrival INTEGER,
  arrived_at TIMESTAMPTZ,
  photos_arrival TEXT[] DEFAULT '{}',
  notes_arrival TEXT,

  -- Calculados
  km_driven INTEGER GENERATED ALWAYS AS (
    CASE WHEN km_arrival IS NOT NULL THEN km_arrival - km_departure ELSE NULL END
  ) STORED,

  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCHEDULES (Agendamentos) — FLEET-002
-- ============================================================
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  collaborator_id UUID NOT NULL REFERENCES collaborators(id),
  destination_branch_id UUID REFERENCES branches(id),
  scheduled_departure TIMESTAMPTZ NOT NULL,
  estimated_return TIMESTAMPTZ,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_trips_collaborator_id ON trips(collaborator_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_schedules_scheduled_departure ON schedules(scheduled_departure);

-- ============================================================
-- SEED DATA — Exemplo inicial
-- ============================================================
INSERT INTO branches (name, city, address) VALUES
  ('Matriz', 'São Paulo', 'Av. Paulista, 1000'),
  ('Filial Sul', 'Curitiba', 'Rua XV de Novembro, 500'),
  ('Filial Norte', 'Manaus', 'Av. Djalma Batista, 200');

INSERT INTO vehicles (plate, model, brand, year, color, status, branch_id)
SELECT 'ABC-1234', 'Civic', 'Honda', 2022, 'Prata', 'available', id FROM branches WHERE name = 'Matriz';

INSERT INTO vehicles (plate, model, brand, year, color, status, branch_id)
SELECT 'DEF-5678', 'Tracker', 'Chevrolet', 2023, 'Branco', 'available', id FROM branches WHERE name = 'Matriz';

INSERT INTO vehicles (plate, model, brand, year, color, status, branch_id)
SELECT 'GHI-9012', 'Hilux', 'Toyota', 2021, 'Preto', 'available', id FROM branches WHERE name = 'Filial Sul';

INSERT INTO collaborators (name, badge_number, branch_id)
SELECT 'João Silva', 'COL-001', id FROM branches WHERE name = 'Matriz';

INSERT INTO collaborators (name, badge_number, branch_id)
SELECT 'Maria Santos', 'COL-002', id FROM branches WHERE name = 'Matriz';
