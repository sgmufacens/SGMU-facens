-- SGMU - Storage Policies
-- Migration: 002_storage_policies
-- Fix: StorageApiError "new row violates row-level security policy"
--
-- Execute este SQL no Supabase SQL Editor

-- ============================================================
-- STORAGE: Policies para o bucket fleet-photos
-- ============================================================

-- Permite upload de fotos (INSERT)
CREATE POLICY "fleet_photos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fleet-photos');

-- Permite leitura pÃºblica das fotos (SELECT)
CREATE POLICY "fleet_photos_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fleet-photos');

-- Permite deletar fotos (DELETE) â€” Ãºtil para manutenÃ§Ã£o
CREATE POLICY "fleet_photos_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'fleet-photos');

-- ============================================================
-- DATABASE: Habilita leitura/escrita nas tabelas principais
-- (as tabelas estÃ£o UNRESTRICTED agora, o que permite acesso
--  com a anon key. Se quiser adicionar RLS depois, faÃ§a aqui)
-- ============================================================

-- Permite leitura pÃºblica nas tabelas de referÃªncia
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_vehicles"    ON vehicles      FOR SELECT USING (true);
CREATE POLICY "public_read_collaborators" ON collaborators FOR SELECT USING (true);
CREATE POLICY "public_read_branches"    ON branches      FOR SELECT USING (true);
CREATE POLICY "public_read_trips"       ON trips         FOR SELECT USING (true);
CREATE POLICY "public_read_schedules"   ON schedules     FOR SELECT USING (true);

-- Permite escrita nas tabelas operacionais
CREATE POLICY "public_insert_trips"     ON trips         FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_trips"     ON trips         FOR UPDATE USING (true);
CREATE POLICY "public_insert_vehicles"  ON vehicles      FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_vehicles"  ON vehicles      FOR UPDATE USING (true);
CREATE POLICY "public_insert_schedules" ON schedules     FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_schedules" ON schedules     FOR UPDATE USING (true);
