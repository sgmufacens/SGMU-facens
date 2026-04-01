import { ImageResponse } from 'next/og'

export const sizes = [
  { width: 32, height: 32 },
  { width: 192, height: 192 },
  { width: 512, height: 512 },
]

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1e40af',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '22%',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="75%"
          height="75%"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="14" y="52" width="72" height="22" rx="4" fill="white" />
          <polygon points="22,52 28,30 72,30 78,52" fill="white" />
          <polygon points="31,50 35,35 50,35 50,50" fill="#1e40af" />
          <polygon points="52,50 52,35 67,35 71,50" fill="#1e40af" />
          <circle cx="29" cy="74" r="11" fill="#1e40af" />
          <circle cx="29" cy="74" r="6" fill="white" />
          <circle cx="71" cy="74" r="11" fill="#1e40af" />
          <circle cx="71" cy="74" r="6" fill="white" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
