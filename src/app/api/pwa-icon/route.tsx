import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const size = parseInt(searchParams.get('size') || '192')
  const radius = size * 0.22

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #2166AB 0%, #1a4f85 100%)',
          borderRadius: radius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: size * 0.04,
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: size * 0.38,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            lineHeight: 1,
          }}
        >
          V
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: size * 0.1,
            fontFamily: 'sans-serif',
            fontWeight: 700,
            letterSpacing: size * 0.01,
          }}
        >
          CONTRATISTAS
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}
