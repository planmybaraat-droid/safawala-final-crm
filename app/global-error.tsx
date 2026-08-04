'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', background: '#F8FAFC' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}>
          {/* Logo area */}
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
            fontSize: 28,
          }}>
            ⚠️
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 15, color: '#64748B', margin: '0 0 32px', maxWidth: 400 }}>
            An unexpected error occurred. Our team has been notified. Please try again or return to the dashboard.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                background: '#6366F1', color: '#fff',
                border: 'none', borderRadius: 8,
                padding: '10px 24px', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              style={{
                background: '#fff', color: '#0F172A',
                border: '1px solid #E2E8F0', borderRadius: 8,
                padding: '10px 24px', fontSize: 14, fontWeight: 600,
                textDecoration: 'none', cursor: 'pointer',
              }}
            >
              Go to Dashboard
            </a>
          </div>

          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 40 }}>
            SafaWala CRM · mysafawale.com
          </p>
        </div>
      </body>
    </html>
  )
}
