'use client'

import { useState, useRef, useEffect } from 'react'
import type { Session, Member } from '@/lib/supabase/types'
import { formatTime } from '@/lib/billing'
import BookingModal from './BookingModal'

interface Props {
  sessions: (Session & { member?: Pick<Member, 'id' | 'name'> })[]
  currentMember: Member | null
  today: string
}

const HOUR_START = 6
const HOUR_END = 30  // 6am next day
const PX_PER_HOUR = 80
const TABLES = [1, 2, 3, 4]

function timeToY(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return ((h - HOUR_START) + m / 60) * PX_PER_HOUR
}

function totalHeight(): number {
  return (HOUR_END - HOUR_START) * PX_PER_HOUR
}

function yToTime(y: number): string {
  const totalMins = Math.round((y / PX_PER_HOUR) * 60 / 30) * 30 + HOUR_START * 60
  const clamped = Math.max(HOUR_START * 60, Math.min(HOUR_END * 60, totalMins))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`
}

function nowY(): number {
  const now = new Date()
  let h = now.getHours()
  const m = now.getMinutes()
  // Early morning (midnight–6am) maps to hours 24–30 on the grid
  if (h < HOUR_START) h += 24
  if (h >= HOUR_END) return -1
  return ((h - HOUR_START) + m / 60) * PX_PER_HOUR
}

type ModalState =
  | { mode: 'new'; table: number; startTime: string }
  | { mode: 'edit'; session: Session & { member?: Pick<Member, 'id' | 'name'> } }

export default function BookingGrid({ sessions, currentMember, today }: Props) {
  const [modal, setModal] = useState<ModalState | null>(null)
  const [localSessions, setLocalSessions] = useState(sessions)
  const [currentY, setCurrentY] = useState(nowY())
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const y = nowY()
    if (y > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, y - 120)
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setCurrentY(nowY()), 60_000)
    return () => clearInterval(t)
  }, [])

  function handleColumnTap(table: number, e: React.MouseEvent<HTMLDivElement>) {
    if (!currentMember) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const snapped = yToTime(y)
    setModal({ mode: 'new', table, startTime: snapped })
  }

  function handleBlockTap(e: React.MouseEvent, s: Session & { member?: Pick<Member, 'id' | 'name'> }) {
    e.stopPropagation()
    if (s.member_id !== currentMember?.id) return
    if (s.payment_status === 'confirmed') return // can't edit confirmed paid sessions
    setModal({ mode: 'edit', session: s })
  }

  function onBooked(newSession: Session & { member?: Pick<Member, 'id' | 'name'> }) {
    setLocalSessions(prev => [...prev, newSession])
    setModal(null)
  }

  function onUpdated(updated: Session & { member?: Pick<Member, 'id' | 'name'> }) {
    setLocalSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
    setModal(null)
  }

  function onDeleted(id: string) {
    setLocalSessions(prev => prev.filter(s => s.id !== id))
    setModal(null)
  }

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div>
          <div className="font-bold text-lg">R.A.S.C</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            {new Date(today + 'T00:00:00').toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
        </div>
        <div className="flex gap-3 text-xs items-center">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'var(--regular)' }} />
            Regular
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'var(--dnd)' }} />
            DND
          </span>
        </div>
      </div>

      {/* Table headers */}
      <div className="flex shrink-0 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
        <div className="w-10 shrink-0" />
        {TABLES.map(t => (
          <div key={t} className="flex-1 text-center py-2 text-sm font-semibold">
            Table {t}
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex relative" style={{ height: totalHeight() }}>
          {/* Hour labels */}
          <div className="w-10 shrink-0 relative">
            {hours.map(h => {
              const topPx = (h - HOUR_START) * PX_PER_HOUR
              const label = h < 12 ? `${h}a`
                : h === 12 ? '12p'
                : h < 24 ? `${h - 12}p`
                : h === 24 ? '12a'
                : `${h - 24}a`
              return (
                <div key={h} className="absolute right-2 text-xs leading-none"
                  style={{ top: Math.max(2, topPx - 6), color: 'var(--muted)' }}>
                  {label}
                </div>
              )
            })}
          </div>

          {/* Current time indicator */}
          {currentY >= 0 && (
            <div className="absolute left-10 right-0 flex items-center pointer-events-none z-10"
              style={{ top: currentY }}>
              <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
              <div className="flex-1 h-px bg-red-500" />
            </div>
          )}

          {/* Table columns */}
          {TABLES.map(table => {
            const tableSessions = localSessions.filter(s => s.table_number === table)
            return (
              <div key={table}
                className="flex-1 relative border-l cursor-pointer select-none"
                style={{ borderColor: 'var(--border)' }}
                onClick={e => handleColumnTap(table, e)}>

                {/* Grid lines */}
                {hours.map(h => (
                  <div key={h} className="absolute w-full border-t"
                    style={{ top: (h - HOUR_START) * PX_PER_HOUR, borderColor: 'var(--border)', opacity: 0.4 }} />
                ))}
                {hours.map(h => (
                  <div key={`${h}h`} className="absolute w-full border-t border-dashed"
                    style={{ top: (h - HOUR_START) * PX_PER_HOUR + PX_PER_HOUR / 2, borderColor: 'var(--border)', opacity: 0.2 }} />
                ))}

                {/* Booking blocks */}
                {tableSessions.map(s => {
                  const top = timeToY(s.start_time)
                  const height = timeToY(s.end_time) - top
                  const isOwn = s.member_id === currentMember?.id
                  const canEdit = isOwn && s.payment_status !== 'confirmed'
                  const color = s.type === 'regular' ? 'var(--regular)' : 'var(--dnd)'
                  return (
                    <div key={s.id}
                      className="absolute left-0.5 right-0.5 rounded overflow-hidden flex flex-col px-1.5 py-1"
                      style={{
                        top, height: Math.max(height, 20),
                        background: color,
                        opacity: isOwn ? 1 : 0.75,
                        cursor: canEdit ? 'pointer' : 'default',
                        outline: canEdit ? '2px solid rgba(255,255,255,0.3)' : 'none',
                      }}
                      onClick={e => handleBlockTap(e, s)}>
                      {/* Time row */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="text-white/80 text-xs leading-tight font-medium">
                          {formatTime(s.start_time)}–{formatTime(s.end_time)}
                        </div>
                        {canEdit && (
                          <span className="text-white/60 text-xs shrink-0 leading-tight">✎</span>
                        )}
                      </div>
                      {/* Name + partner row */}
                      {height > 22 && (
                        <div className="text-white font-semibold text-xs leading-tight break-words">
                          {s.type === 'dnd'
                            ? `${s.member?.name ?? 'Unknown'} DND`
                            : s.partner === 'Looking for ball picker'
                              ? `${s.member?.name ?? 'Unknown'} is looking for ball picker`
                              : s.partner
                                ? `${s.member?.name ?? 'Unknown'} & ${s.partner}`
                                : (s.member?.name ?? 'Unknown')
                          }
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 px-4 py-3 border-t flex gap-3"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <a href="/sessions"
          className="flex-1 py-3 rounded-xl text-center text-sm font-semibold border"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
          My Sessions
        </a>
        {currentMember?.is_admin && (
          <a href="/admin"
            className="flex-1 py-3 rounded-xl text-center text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'white' }}>
            Admin
          </a>
        )}
      </div>

      {/* Modal */}
      {modal && currentMember && (
        <BookingModal
          table={modal.mode === 'new' ? modal.table : modal.session.table_number}
          startTime={modal.mode === 'new' ? modal.startTime : modal.session.start_time}
          today={today}
          currentMember={currentMember}
          editSession={modal.mode === 'edit' ? modal.session : undefined}
          existingSessions={localSessions.filter(s =>
            s.table_number === (modal.mode === 'new' ? modal.table : modal.session.table_number)
          )}
          onClose={() => setModal(null)}
          onBooked={onBooked}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      )}
    </div>
  )
}
