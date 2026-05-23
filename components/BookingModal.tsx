'use client'

import { useState } from 'react'
import type { Session, Member, SessionType } from '@/lib/supabase/types'
import { calcTableFee, calcTotal, formatDuration, formatTime } from '@/lib/billing'
import { createClient } from '@/lib/supabase/client'
import PartnerPicker from './PartnerPicker'

interface Props {
  table: number
  startTime: string
  today: string
  currentMember: Member
  editSession?: Session & { member?: Pick<Member, 'id' | 'name'> }
  existingSessions: Session[]
  onClose: () => void
  onBooked: (s: Session & { member?: Pick<Member, 'id' | 'name'> }) => void
  onUpdated: (s: Session & { member?: Pick<Member, 'id' | 'name'> }) => void
  onDeleted: (id: string) => void
}

const HOUR_START = 6
const HOUR_END = 30  // 6am next day

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`
}

function addMinutes(time: string, mins: number): string {
  const total = Math.min(timeToMins(time) + mins, HOUR_END * 60)
  return minsToTime(total)
}

function snapTo5(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const snapped = Math.round(m / 5) * 5
  if (snapped === 60) return `${(h + 1).toString().padStart(2, '0')}:00:00`
  return `${h.toString().padStart(2, '0')}:${snapped.toString().padStart(2, '0')}:00`
}

function clampTime(time: string): string {
  const mins = timeToMins(time)
  return minsToTime(Math.max(HOUR_START * 60, Math.min(HOUR_END * 60, mins)))
}

export default function BookingModal({
  table, startTime: rawStart, today, currentMember,
  editSession, existingSessions, onClose, onBooked, onUpdated, onDeleted
}: Props) {
  const isEdit = !!editSession
  const [start, setStart] = useState(isEdit ? editSession!.start_time : snapTo5(clampTime(rawStart)))
  const [end, setEnd] = useState(isEdit ? editSession!.end_time : addMinutes(snapTo5(clampTime(rawStart)), 60))
  const [type, setType] = useState<SessionType>(isEdit ? editSession!.type : 'regular')
  const [partner, setPartner] = useState<string | null>(isEdit ? (editSession!.partner ?? null) : null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const startMins = timeToMins(start)
  const endMins = timeToMins(end)
  const valid = endMins > startMins

  function hasOverlap(): boolean {
    return existingSessions.some(s => {
      if (isEdit && s.id === editSession!.id) return false // skip self
      const sStart = timeToMins(s.start_time)
      const sEnd = timeToMins(s.end_time)
      return startMins < sEnd && endMins > sStart
    })
  }

  function adjustStart(delta: number) {
    const newMins = Math.max(HOUR_START * 60, Math.min(endMins - 5, startMins + delta))
    setStart(minsToTime(newMins))
  }

  function adjustEnd(delta: number) {
    const newMins = Math.max(startMins + 5, Math.min(HOUR_END * 60, endMins + delta))
    setEnd(minsToTime(newMins))
  }

  const tableFee = valid ? calcTableFee(start, end, type) : 0
  const overlap = hasOverlap()

  async function book() {
    if (!valid || overlap) return
    setError('')
    setLoading(true)
    const { data, error: err } = await supabase
      .from('sessions')
      .insert({
        member_id: currentMember.id,
        table_number: table,
        date: today,
        start_time: start,
        end_time: end,
        type,
        drinks_amount: 0,
        carpark_amount: 0,
        table_fee: tableFee,
        total_amount: calcTotal(tableFee, 0, 0),
        payment_status: 'unpaid',
        partner: type === 'regular' ? partner : null,
      })
      .select('*, member:members(id, name)')
      .single()
    setLoading(false)
    if (err) { setError(err.message); return }
    onBooked(data as Session & { member?: Pick<Member, 'id' | 'name'> })
  }

  async function update() {
    if (!valid || overlap || !editSession) return
    setError('')
    setLoading(true)
    const newTableFee = calcTableFee(start, end, type)
    const { data, error: err } = await supabase
      .from('sessions')
      .update({
        start_time: start,
        end_time: end,
        type,
        table_fee: newTableFee,
        total_amount: calcTotal(newTableFee, editSession.drinks_amount, editSession.carpark_amount),
        partner: type === 'regular' ? partner : null,
      })
      .eq('id', editSession.id)
      .select('*, member:members(id, name)')
      .single()
    setLoading(false)
    if (err) { setError(err.message); return }
    onUpdated(data as Session & { member?: Pick<Member, 'id' | 'name'> })
  }

  async function deleteSession() {
    if (!editSession) return
    setDeleting(true)
    const { error: err } = await supabase
      .from('sessions')
      .delete()
      .eq('id', editSession.id)
    setDeleting(false)
    if (err) { setError(err.message); return }
    onDeleted(editSession.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}>
      <div className="w-full rounded-t-2xl p-6 flex flex-col gap-5"
        style={{ background: 'var(--surface)' }}
        onClick={e => e.stopPropagation()}>

        <div className="w-10 h-1 rounded-full mx-auto mb-1" style={{ background: 'var(--border)' }} />

        <div className="flex items-center justify-between">
          <div className="font-bold text-lg">
            {isEdit ? 'Edit Booking' : `Book Table ${table}`}
          </div>
          {isEdit && (
            <button
              onClick={deleteSession}
              disabled={deleting}
              className="text-sm px-3 py-1.5 rounded-lg font-medium disabled:opacity-40"
              style={{ background: '#7f1d1d', color: '#fca5a5' }}>
              {deleting ? 'Removing…' : 'Remove'}
            </button>
          )}
        </div>

        {/* Type toggle */}
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {(['regular', 'dnd'] as SessionType[]).map(t => (
            <button key={t} onClick={() => setType(t)}
              className="flex-1 py-2.5 text-sm font-semibold transition-colors"
              style={{
                background: type === t ? (t === 'regular' ? 'var(--regular)' : 'var(--dnd)') : 'var(--surface-2)',
                color: type === t ? 'white' : 'var(--muted)'
              }}>
              {t === 'regular' ? 'Regular — $14.40/hr' : 'DND — $8/hr'}
            </button>
          ))}
        </div>

        {/* Time pickers */}
        <div className="flex gap-4">
          {[{ label: 'Start', time: start, adj: adjustStart }, { label: 'End', time: end, adj: adjustEnd }].map(({ label, time, adj }) => (
            <div key={label} className="flex-1">
              <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{label}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => adj(-5)}
                  className="w-9 h-9 rounded-lg text-lg font-bold flex items-center justify-center"
                  style={{ background: 'var(--surface-2)' }}>−</button>
                <div className="flex-1 text-center font-mono text-base font-semibold">
                  {formatTime(time)}
                </div>
                <button onClick={() => adj(5)}
                  className="w-9 h-9 rounded-lg text-lg font-bold flex items-center justify-center"
                  style={{ background: 'var(--surface-2)' }}>+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick duration shortcuts */}
        <div className="flex gap-2">
          {[60, 90, 120, 180].map(mins => (
            <button key={mins}
              onClick={() => setEnd(addMinutes(start, mins))}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'var(--surface-2)' }}>
              {mins < 60 ? `${mins}m` : `${mins / 60}h`}
            </button>
          ))}
        </div>

        {/* Partner picker — only for regular sessions */}
        {type === 'regular' && (
          <PartnerPicker
            value={partner}
            currentMemberId={currentMember.id}
            onChange={setPartner}
          />
        )}

        {/* Fee summary */}
        {valid && (
          <div className="rounded-xl px-4 py-3 flex justify-between items-center"
            style={{ background: 'var(--surface-2)' }}>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              {formatDuration(start, end)} · {type === 'regular' ? 'Regular' : 'DND'}
            </div>
            <div className="font-bold text-lg">${tableFee.toFixed(2)}</div>
          </div>
        )}

        {overlap && <p className="text-sm text-red-400 text-center">Overlaps with an existing booking.</p>}
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          onClick={isEdit ? update : book}
          disabled={loading || !valid || overlap}
          className="w-full py-3.5 rounded-xl font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: 'var(--accent)' }}>
          {loading ? (isEdit ? 'Updating…' : 'Booking…') : (isEdit ? 'Update Booking' : 'Confirm Booking')}
        </button>
      </div>
    </div>
  )
}
