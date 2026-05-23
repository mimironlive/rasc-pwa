'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

function field(tag: string, val: string): string {
  return `${tag}${val.length.toString().padStart(2, '0')}${val}`
}

function crc16(str: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function buildPayNowString(uen: string, amount: number, name: string): string {
  const paynow =
    field('00', 'SG.PAYNOW') +
    field('01', '2') +            // proxy type: UEN
    field('02', uen) +
    field('03', '0')              // amount not editable

  const additionalData = field('01', name.substring(0, 25))

  const body =
    field('00', '01') +           // payload format indicator
    field('01', '12') +           // dynamic QR
    field('26', paynow) +         // PayNow merchant account info
    field('52', '0000') +         // merchant category code
    field('53', '702') +          // SGD
    field('54', amount.toFixed(2)) +
    field('58', 'SG') +
    field('59', 'R.A.S.C') +      // merchant name (max 25 chars)
    field('60', 'Singapore') +
    field('62', additionalData) +
    '6304'                        // CRC tag + length prefix

  return body + crc16(body)
}

interface Props {
  uen: string
  amount: number
  memberName: string
}

export default function PayNowQR({ uen, amount, memberName }: Props) {
  const [dataUrl, setDataUrl] = useState<string>('')

  useEffect(() => {
    const qrString = buildPayNowString(uen, amount, memberName)
    QRCode.toDataURL(qrString, {
      width: 220,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setDataUrl).catch(() => {})
  }, [uen, amount, memberName])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl p-3 bg-white shadow-sm">
        {dataUrl
          ? <img src={dataUrl} alt="PayNow QR" width={180} height={180} />
          : <div className="w-[180px] h-[180px] animate-pulse rounded-lg" style={{ background: '#e5e7eb' }} />
        }
      </div>
      <div className="text-center">
        <div className="font-bold text-2xl">${amount.toFixed(2)}</div>
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>R.A.S.C · UEN {uen}</div>
      </div>
      <div className="rounded-xl px-4 py-3 text-xs text-center w-full" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>
        <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>Screenshot this QR</span>
        {' '}→ open bank app → PayNow → Scan from photos
      </div>
    </div>
  )
}
