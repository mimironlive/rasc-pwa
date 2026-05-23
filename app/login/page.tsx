'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Step = 'phone' | 'otp'

export default function LoginPage() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function sendOtp() {
    setError('')
    setLoading(true)
    const formatted = phone.startsWith('+') ? phone : `+65${phone}`
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('otp')
  }

  async function verifyOtp() {
    setError('')
    setLoading(true)
    const formatted = phone.startsWith('+') ? phone : `+65${phone}`
    const { error } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: 'sms' })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/book')
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 min-h-screen"
      style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <div className="text-5xl font-black tracking-tight mb-1" style={{ color: 'var(--accent)' }}>
            R.A.S.C
          </div>
          <div className="text-sm tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
            Snookerium
          </div>
        </div>

        {step === 'phone' ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--muted)' }}>
                Mobile Number
              </label>
              <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                <span className="flex items-center px-4 text-sm font-medium"
                  style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>
                  +65
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="9123 4567"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()}
                  className="flex-1 px-4 py-3.5 text-base outline-none"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
                  maxLength={8}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={sendOtp}
              disabled={loading || phone.length < 8}
              className="w-full py-3.5 rounded-xl font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--muted)' }}>
                Enter the 6-digit code sent to +65{phone}
              </label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="• • • • • •"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                className="w-full px-4 py-3.5 rounded-xl text-center text-2xl tracking-widest font-mono outline-none border"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  borderColor: 'var(--border)'
                }}
                maxLength={6}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length < 6}
              className="w-full py-3.5 rounded-xl font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              onClick={() => { setStep('phone'); setOtp(''); setError('') }}
              className="text-sm text-center"
              style={{ color: 'var(--muted)' }}
            >
              ← Change number
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
