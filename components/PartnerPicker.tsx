'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/lib/supabase/types'

const SPECIAL = ['Guest', 'Looking for ball picker']

interface Props {
  value: string | null
  currentMemberId: string
  onChange: (v: string | null) => void
}

export default function PartnerPicker({ value, currentMemberId, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('members')
      .select('id, name, phone, is_admin, created_at')
      .order('name')
      .then(({ data }) => {
        setMembers((data ?? []).filter((m: Member) => m.id !== currentMemberId) as Member[])
      })
  }, [currentMemberId])

  const filtered = [
    ...SPECIAL.filter(s => s.toLowerCase().includes(search.toLowerCase())),
    ...members.filter(m => m.name.toLowerCase().includes(search.toLowerCase())),
  ]

  function select(v: string) {
    onChange(v)
    setOpen(false)
    setSearch('')
  }

  function clear() {
    onChange(null)
  }

  return (
    <>
      {/* Trigger */}
      <div>
        <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Sparring partner</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm text-left border"
            style={{
              background: 'var(--surface-2)',
              borderColor: value ? 'var(--regular)' : 'var(--border)',
              color: value ? 'var(--foreground)' : 'var(--muted)'
            }}>
            {value ?? 'Select partner / guest…'}
          </button>
          {value && (
            <button
              type="button"
              onClick={clear}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
              style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* Full-screen picker */}
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--background)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b shrink-0"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <button onClick={() => { setOpen(false); setSearch('') }}
              className="text-xl" style={{ color: 'var(--muted)' }}>←</button>
            <div className="font-semibold flex-1">Select Partner</div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
            <input
              type="text"
              placeholder="Search member…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>
                No results
              </div>
            )}
            {filtered.map((item, i) => {
              const label = typeof item === 'string' ? item : (item as Member).name
              const isSpecial = typeof item === 'string'
              const isSelected = value === label
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => select(label)}
                  className="w-full flex items-center justify-between px-4 py-3.5 border-b text-left"
                  style={{
                    borderColor: 'var(--border)',
                    background: isSelected ? 'var(--surface-2)' : 'transparent',
                    color: isSpecial ? 'var(--muted)' : 'var(--foreground)'
                  }}>
                  <span className="text-sm font-medium">{label}</span>
                  {isSelected && <span style={{ color: 'var(--accent)' }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
