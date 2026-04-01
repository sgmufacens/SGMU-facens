-- FleetControl - Admin Policies
-- Migration: 003_admin_policies
-- Adiciona permissões de escrita para o painel de administração
--
-- Execute este SQL no Supabase SQL Editor

-- Branches: permitir criar e editar
CREATE POLICY "public_insert_branches"
  ON branches FOR INSERT WITH CHECK (true);

CREATE POLICY "public_update_branches"
  ON branches FOR UPDATE USING (true);

-- Collaborators: permitir criar e editar
CREATE POLICY "public_insert_collaborators"
  ON collaborators FOR INSERT WITH CHECK (true);

CREATE POLICY "public_update_collaborators"
  ON collaborators FOR UPDATE USING (true);
