import type { SessionType } from './supabase/types'

const REGULAR_RATE_PER_5MIN = 1.20
const DND_RATE_PER_15MIN = 2.00

export function calcTableFee(startTime: string, endTime: string, type: SessionType): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const totalMinutes = (eh * 60 + em) - (sh * 60 + sm)

  if (type === 'regular') {
    const blocks = Math.ceil(totalMinutes / 5)
    return parseFloat((blocks * REGULAR_RATE_PER_5MIN).toFixed(2))
  } else {
    const blocks = Math.ceil(totalMinutes / 15)
    return parseFloat((blocks * DND_RATE_PER_15MIN).toFixed(2))
  }
}

export function calcTotal(tableFee: number, drinks: number, carpark: number): number {
  return parseFloat((tableFee + drinks + carpark).toFixed(2))
}

export function formatDuration(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const totalMinutes = (eh * 60 + em) - (sh * 60 + sm)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}hr`
  return `${h}hr ${m}min`
}

export function formatTime(time: string): string {
  let [h, m] = time.split(':').map(Number)
  if (h >= 24) h -= 24  // midnight–6am: 24→0, 25→1, etc.
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${m.toString().padStart(2, '0')}${suffix}`
}
