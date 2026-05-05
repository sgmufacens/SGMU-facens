-- SGMU - User Authentication
-- Migration: 004_user_auth
-- Vincula colaboradores ao Supabase Auth
--
-- Execute este SQL no Supabase SQL Editor

-- Adiciona user_id na tabela collaborators
ALTER TABLE collaborators
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON collaborators(user_id);

-- Policy: cada usuÃ¡rio sÃ³ vÃª seus prÃ³prios dados de auth
-- (as outras policies de SELECT/UPDATE jÃ¡ existem da migration 003)
