'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Wrench, CheckCircle, Car } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminModal } from '@/components/AdminModal'
import type { Vehicle, Branch } from '@/types'

type FormState = {
  plate: string; model: string; brand: string
  year: string; color: string; branch_id: string
  status: string
}

const EMPTY: FormState = { plate: '', model: '', brand: '', year: '', color: '', branch_id: '', status: 'available' }

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: v }, { data: b }] = await Promise.all([
      supabase.from('vehicles').select('*, branch:branches(name, city)').order('plate'),
      supabase.from('branches').select('*').order('name'),
    ])
    setVehicles(v ?? [])
    setBranches(b ?? [])
  }

  useEffect(() => { load() }, [])

  function openAdd() { setForm(EMPTY); setEditing(null); setModal('add') }

  function openEdit(v: Vehicle) {
    setForm({
      plate: v.plate, model: v.model, brand: v.brand,
      year: String(v.year), color: v.color ?? '',
      branch_id: v.branch_id ?? '', status: v.status,
    })
    setEditing(v)
    setModal('edit')
  }

  async function save() {
    if (!form.plate || !form.model || !form.brand || !form.year) return
    setSaving(true)
    const payload = {
      ...form,
      year: parseInt(form.year),
      branch_id: form.branch_id || null,
      color: form.color || null,
    }
    if (editing) {
      await supabase.from('vehicles').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('vehicles').insert(payload)
    }
    setSaving(false)
    setModal(null)
    load()
  }

  async function toggleStatus(v: Vehicle) {
    const next = v.status === 'maintenance' ? 'available' : 'maintenance'
    await supabase.from('vehicles').update({ status: next }).eq('id', v.id)
    load()
  }

  const statusMap: Record<string, { label: string; cls: string }> = {
    available:   { label: 'Disponível', cls: 'bg-green-100 text-green-700' },
    in_use:      { label: 'Em uso',     cls: 'bg-amber-100 text-amber-700' },
    maintenance: { label: 'Manutenção', cls: 'bg-red-100 text-red-700' },
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">Veículos <span className="text-slate-400 font-normal text-base">({vehicles.length})</span></h1>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-blue-700 text-white px-3 py-2 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Novo veículo
        </button>
      </div>

      <div className="space-y-2">
        {vehicles.map(v => {
          const st = statusMap[v.status]
          return (
            <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Car className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{v.plate}</p>
                    <p className="text-sm text-slate-500">{v.brand} {v.model} · {v.year} · {v.color}</p>
                    {(v.branch as any) && (
                      <p className="text-xs text-slate-400">{(v.branch as any).name} — {(v.branch as any).city}</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${st.cls}`}>{st.label}</span>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button onClick={() => openEdit(v)} className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-slate-50">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                {v.status !== 'in_use' && (
                  <button onClick={() => toggleStatus(v)} className="flex items-center gap-1 text-xs text-slate-600 hover:text-amber-700 px-2 py-1 rounded-lg hover:bg-slate-50">
                    {v.status === 'maintenance'
                      ? <><CheckCircle className="w-3.5 h-3.5" /> Marcar disponível</>
                      : <><Wrench className="w-3.5 h-3.5" /> Manutenção</>
                    }
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <AdminModal title={modal === 'add' ? 'Novo veículo' : 'Editar veículo'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Placa *" value={form.plate} onChange={v => setForm(f => ({ ...f, plate: v }))} placeholder="ABC-1234" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marca *" value={form.brand} onChange={v => setForm(f => ({ ...f, brand: v }))} placeholder="Honda" />
              <Field label="Modelo *" value={form.model} onChange={v => setForm(f => ({ ...f, model: v }))} placeholder="Civic" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ano *" type="number" value={form.year} onChange={v => setForm(f => ({ ...f, year: v }))} placeholder="2023" />
              <Field label="Cor" value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} placeholder="Prata" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Filial</label>
              <select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
                <option value="">Sem filial</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name} — {b.city}</option>)}
              </select>
            </div>
            {editing && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
                  <option value="available">Disponível</option>
                  <option value="maintenance">Manutenção</option>
                </select>
              </div>
            )}
            <button onClick={save} disabled={saving} className="w-full bg-blue-700 text-white py-2.5 rounded-xl font-medium mt-2 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
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
