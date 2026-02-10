export default function AlertsPage() {
  return (
    <div>
      <div className="mb-10">
        <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl mb-2">
          Alerts
        </h1>
        <p className="text-muted">Configure how you get notified about new mentions.</p>
      </div>

      <div className="glass-card p-12 text-center">
        <svg className="w-12 h-12 text-light-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <p className="text-muted mb-2">Telegram Alerts</p>
        <p className="text-sm text-light-muted mb-6">Get instant notifications when new coverage drops on your topics.</p>
        <div className="inline-block text-xs text-light-muted bg-cream-100 px-3 py-1 rounded-full">
          Coming in v0.2
        </div>
      </div>
    </div>
  )
}
