export const metadata = {
  title: 'Offline | Drive Academy',
}

export default function OfflinePage() {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center fade-in">
      <div
        className="w-full max-w-lg px-5 py-6 sm:px-8 sm:py-8"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--accent)' }}
      >
        <div className="font-condensed font-black text-2xl sm:text-3xl tracking-widest uppercase" style={{ color: 'var(--accent)' }}>
          Offline Mode
        </div>
        <p className="mt-3 text-sm sm:text-base" style={{ color: 'var(--text)' }}>
          The app shell is open, but this page was not available from the network.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Previously cached attendance data can still load, and any offline changes will sync when the device is online again.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href="/"
            className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-3"
            style={{ background: 'var(--accent)', color: '#000', textDecoration: 'none' }}
          >
            Go to Home
          </a>
          <button
            onClick={() => window.location.reload()}
            className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-3"
            style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  )
}
