'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, UserCheck, UserX, KeyRound, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminModal } from '@/components/AdminModal'
import type { Collaborator, Branch } from '@/types'

type FormState = { name: string; badge_number: string; branch_id: string }
const EMPTY: FormState = { name: '', badge_number: '', branch_id: '' }
type AccessForm = { email: string; password: string }

export default function CollaboratorsPage() {
  const [collaborators, setCollaborators] = useState<(Collaborator & { user_id?: string | null })[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | 'access' | null>(null)
  const [editing, setEditing] = useState<Collaborator | null>(null)
  const [accessTarget, setAccessTarget] = useState<Collaborator | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [accessForm, setAccessForm] = useState<AccessForm>({ email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active')

  async function load() {
    const [collabRes, { data: b }] = await Promise.all([
      fetch('/api/admin/collaborators').then(r => r.json()),
      supabase.from('branches').select('*').order('name'),
    ])
    setCollaborators(Array.isArray(collabRes) ? collabRes : [])
    setBranches(b ?? [])
  }

  useEffect(() => { load() }, [])

  function openAdd() { setForm(EMPTY); setEditing(null); setModal('add') }

  function openEdit(c: Collaborator) {
    setForm({ name: c.name, badge_number: c.badge_number, branch_id: c.branch_id ?? '' })
    setEditing(c)
    setModal('edit')
  }

  function openAccess(c: Collaborator) {
    setAccessTarget(c)
    setAccessForm({ email: '', password: '' })
    setModal('access')
  }

  async function save() {
    if (!form.name || !form.badge_number) return
    setSaving(true)
    try {
      const payload = { name: form.name, badge_number: form.badge_number, branch_id: form.branch_id || null }
      const res = editing
        ? await fetch('/api/admin/collaborators', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
        : await fetch('/api/admin/collaborators', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) { alert(`Erro: ${json.error}`); return }
      setModal(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function createAccess() {
    if (!accessTarget || !accessForm.email || !accessForm.password) return
    if (accessForm.password.length < 6) { alert('A senha deve ter pelo menos 6 caracteres.'); return }
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: accessForm.email, password: accessForm.password, collaboratorId: accessTarget.id }),
    })
    const json = await res.json()
    if (!res.ok) { alert(`Erro: ${json.error}`) }
    else { setModal(null); load() }
    setSaving(false)
  }

  async function removeAccess(c: Collaborator) {
    if (!confirm(`Remover acesso de ${c.name}? O usuário não conseguirá mais logar.`)) return
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collaboratorId: c.id }),
    })
    if (!res.ok) { alert('Erro ao remover acesso.'); return }
    load()
  }

  async function toggleActive(c: Collaborator) {
    const res = await fetch('/api/admin/collaborators', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, is_active: !c.is_active }) })
    if (!res.ok) { alert('Erro ao alterar status do colaborador.'); return }
    load()
  }

  const filtered = collaborators.filter(c =>
    filter === 'all' ? true : filter === 'active' ? c.is_active : !c.is_active
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">Colaboradores <span className="text-slate-400 font-normal text-base">({filtered.length})</span></h1>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-blue-700 text-white px-3 py-2 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Novo
        </button>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {(['active', 'inactive', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
            {f === 'active' ? 'Ativos' : f === 'inactive' ? 'Inativos' : 'Todos'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(c => (
          <div key={c.id} className={`bg-white border rounded-xl p-3 ${c.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-semibold text-sm">{c.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{c.name}</p>
                  <p className="text-sm text-slate-500">Setor: {c.badge_number}</p>
                  {(c.branch as any) && <p className="text-xs text-slate-400">{(c.branch as any).name}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {c.is_active ? 'Ativo' : 'Inativo'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.user_id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                  {c.user_id ? 'Com acesso' : 'Sem acesso'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
              <button onClick={() => openEdit(c)} className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-slate-50">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
              {!c.user_id ? (
                <button onClick={() => openAccess(c)} className="flex items-center gap-1 text-xs text-slate-600 hover:text-green-700 px-2 py-1 rounded-lg hover:bg-slate-50">
                  <KeyRound className="w-3.5 h-3.5" /> Criar acesso
                </button>
              ) : (
                <button onClick={() => removeAccess(c)} className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-slate-50">
                  <Trash2 className="w-3.5 h-3.5" /> Remover acesso
                </button>
              )}
              <button onClick={() => toggleActive(c)} className="flex items-center gap-1 text-xs text-slate-600 hover:text-amber-700 px-2 py-1 rounded-lg hover:bg-slate-50">
                {c.is_active ? <><UserX className="w-3.5 h-3.5" /> Desativar</> : <><UserCheck className="w-3.5 h-3.5" /> Reativar</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <AdminModal title={modal === 'add' ? 'Novo colaborador' : 'Editar colaborador'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Nome completo *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="João Silva" />
            <Field label="Setor *" value={form.badge_number} onChange={v => setForm(f => ({ ...f, badge_number: v }))} placeholder="TI, Comercial, Logística..." />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Filial</label>
              <select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
                <option value="">Sem filial</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name} — {b.city}</option>)}
              </select>
            </div>
            <button onClick={save} disabled={saving} className="w-full bg-blue-700 text-white py-2.5 rounded-xl font-medium mt-2 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </AdminModal>
      )}

      {modal === 'access' && accessTarget && (
        <AdminModal title={`Criar acesso — ${accessTarget.name}`} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
              O colaborador usará este e-mail e senha para entrar no FleetControl.
            </div>
            <Field label="E-mail *" value={accessForm.email} onChange={v => setAccessForm(f => ({ ...f, email: v }))} placeholder="joao.silva@empresa.com" type="email" />
            <Field label="Senha *" value={accessForm.password} onChange={v => setAccessForm(f => ({ ...f, password: v }))} placeholder="Mínimo 6 caracteres" type="password" />
            <button onClick={createAccess} disabled={saving || !accessForm.email || !accessForm.password}
              className="w-full bg-green-600 text-white py-2.5 rounded-xl font-medium mt-2 disabled:opacity-50">
              {saving ? 'Criando acesso...' : 'Criar acesso'}
            </button>
          </div>
        </AdminModal>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-slate-300 rounded-lg px-3 py-2.5" />
    </div>
  )
}
