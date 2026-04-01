'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminModal } from '@/components/AdminModal'
import type { Branch } from '@/types'

type FormState = { name: string; city: string; address: string }
const EMPTY: FormState = { name: '', city: '', address: '' }

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [counts, setCounts] = useState<Record<string, { vehicles: number; collaborators: number }>>({})

  async function load() {
    const [{ data: b }, { data: v }, { data: c }] = await Promise.all([
      supabase.from('branches').select('*').order('name'),
      supabase.from('vehicles').select('id, branch_id'),
      supabase.from('collaborators').select('id, branch_id').eq('is_active', true),
    ])
    setBranches(b ?? [])
    const map: Record<string, { vehicles: number; collaborators: number }> = {}
    for (const br of (b ?? [])) {
      map[br.id] = {
        vehicles: (v ?? []).filter(x => x.branch_id === br.id).length,
        collaborators: (c ?? []).filter(x => x.branch_id === br.id).length,
      }
    }
    setCounts(map)
  }

  useEffect(() => { load() }, [])

  function openAdd() { setForm(EMPTY); setEditing(null); setModal('add') }

  function openEdit(b: Branch) {
    setForm({ name: b.name, city: b.city, address: b.address ?? '' })
    setEditing(b)
    setModal('edit')
  }

  async function save() {
    if (!form.name || !form.city) return
    setSaving(true)
    if (editing) {
      await supabase.from('branches').update(form).eq('id', editing.id)
    } else {
      await supabase.from('branches').insert(form)
    }
    setSaving(false)
    setModal(null)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">Filiais <span className="text-slate-400 font-normal text-base">({branches.length})</span></h1>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-blue-700 text-white px-3 py-2 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Nova filial
        </button>
      </div>

      <div className="space-y-2">
        {branches.map(b => (
          <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{b.name}</p>
                  <p className="text-sm text-slate-500">{b.city}</p>
                  {b.address && <p className="text-xs text-slate-400">{b.address}</p>}
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>{counts[b.id]?.vehicles ?? 0} veíc.</p>
                <p>{counts[b.id]?.collaborators ?? 0} colab.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
              <button onClick={() => openEdit(b)} className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-slate-50">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <AdminModal title={modal === 'add' ? 'Nova filial' : 'Editar filial'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Nome *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Filial Norte" />
            <Field label="Cidade *" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} placeholder="São Paulo" />
            <Field label="Endereço" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="Av. Paulista, 1000" />
            <button onClick={save} disabled={saving} className="w-full bg-blue-700 text-white py-2.5 rounded-xl font-medium mt-2 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </AdminModal>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-1 block">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-slate-300 rounded-lg px-3 py-2.5" />
    </div>
  )
}
