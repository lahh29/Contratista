import { ImageResponse } from 'next/og'

export const runtime = 'edge'

// Colores de marca fijos para el ícono PWA generado en edge runtime.
// No pueden venir de CSS variables ya que este entorno no tiene acceso al DOM.
const BRAND_BG_START  = '#2166AB'
const BRAND_BG_END    = '#1a4f85'
const BRAND_FG        = '#ffffff'
const BRAND_FG_MUTED  = 'rgba(255, 255, 255, 0.75)'

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
          background: `linear-gradient(135deg, ${BRAND_BG_START} 0%, ${BRAND_BG_END} 100%)`,
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
            color: BRAND_FG,
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
            color: BRAND_FG_MUTED,
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
