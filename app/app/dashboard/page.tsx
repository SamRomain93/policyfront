import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl mb-2">
          Dashboard
        </h1>
        <p className="text-muted">Your policy intelligence at a glance.</p>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Active Topics', value: '0', change: null },
          { label: 'Mentions Today', value: '0', change: null },
          { label: 'Alerts Sent', value: '0', change: null },
          { label: 'Sentiment', value: '--', change: null },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-6">
            <div className="text-sm text-muted mb-1">{stat.label}</div>
            <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
            {stat.change && (
              <div className="text-xs text-emerald-600 mt-1">{stat.change}</div>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-6 mb-10">
        <Link href="/dashboard/topics" className="glass-card p-8 hover:bg-white/70 transition-all group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg group-hover:text-accent transition">Add a Topic</h3>
              <p className="text-sm text-muted">Start tracking a bill or policy area</p>
            </div>
          </div>
        </Link>

        <div className="glass-card p-8 opacity-60">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-cream-200 flex items-center justify-center">
              <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Configure Alerts</h3>
              <p className="text-sm text-muted">Set up Telegram notifications</p>
              <span className="inline-block text-xs text-light-muted mt-1 bg-cream-100 px-2 py-0.5 rounded">Coming soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity (empty state) */}
      <div>
        <h2 className="font-semibold text-xl mb-4">Recent Mentions</h2>
        <div className="glass-card p-12 text-center">
          <svg className="w-12 h-12 text-light-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
          </svg>
          <p className="text-muted mb-2">No mentions yet</p>
          <p className="text-sm text-light-muted">Add a topic to start monitoring media coverage</p>
        </div>
      </div>
    </div>
  )
}
