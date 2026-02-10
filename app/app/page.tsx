import WaitlistForm from './components/WaitlistForm'

export default function Home() {
  return (
    <main className="overflow-hidden">
      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cream-50/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-4 flex justify-between items-center">
          <div className="font-[family-name:var(--font-serif)] text-2xl tracking-tight">
            PolicyFront
          </div>
          <div className="flex items-center gap-6">
            <a href="#pricing" className="text-sm text-muted hover:text-near-black transition hidden sm:block">
              Pricing
            </a>
            <a href="#waitlist" className="bg-near-black text-cream-50 text-sm font-medium px-5 py-2.5 rounded-full hover:bg-near-black/85 transition">
              Join Waitlist
            </a>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="pt-40 pb-32 sm:pt-52 sm:pb-40 px-6 sm:px-10">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm font-medium tracking-widest uppercase text-accent mb-8 fade-in-up">
            Policy Intelligence Platform
          </p>
          <h1 className="font-[family-name:var(--font-serif)] text-[clamp(2.75rem,6vw,5.5rem)] leading-[1.05] tracking-tight mb-8 fade-in-up delay-100">
            Know the bill.<br />
            Know the <span className="serif-italic">story</span>.
          </h1>
          <p className="text-xl sm:text-2xl text-muted leading-relaxed max-w-2xl mx-auto mb-12 fade-in-up delay-200">
            Track legislation and media coverage in one place.
            Built for the people shaping policy.
          </p>
          <div className="flex justify-center fade-in-up delay-300">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ─── Marquee ─── */}
      <div className="border-y border-border/60 py-4 overflow-hidden bg-cream-100/50">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-12 mx-6">
              {['Bill Tracking', 'Media Monitoring', 'Sentiment Analysis', 'Journalist Database', 'Coverage Attribution', 'Cross-State Patterns', 'Telegram Alerts', 'Paywalled Sources'].map((item) => (
                <span key={`${i}-${item}`} className="text-sm text-light-muted font-medium tracking-wide uppercase flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Problem / Solution ─── */}
      <section className="py-28 sm:py-40 px-6 sm:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
            <div>
              <h2 className="font-[family-name:var(--font-serif)] text-[clamp(2rem,3.5vw,3rem)] leading-tight mb-8">
                You already know<br />the problem
              </h2>
              <div className="space-y-5 text-lg text-muted leading-relaxed">
                <p>
                  LegiScan for bills. Google Alerts for news. A spreadsheet to connect the dots. Three Slack channels to coordinate the response.
                </p>
                <p>
                  By the time you see the story, it&apos;s already shaped the conversation.
                </p>
              </div>
            </div>
            <div className="glass-card p-10 sm:p-12">
              <h3 className="font-[family-name:var(--font-serif)] text-2xl sm:text-3xl mb-6">
                PolicyFront connects the dots
              </h3>
              <ul className="space-y-5">
                {[
                  { label: 'Bill introduced in committee', color: 'bg-accent' },
                  { label: 'Politico Pro runs the story at 6am', color: 'bg-amber-500' },
                  { label: 'Telegram alert hits your phone at 6:01am', color: 'bg-emerald-500' },
                  { label: 'You respond before anyone else wakes up', color: 'bg-near-black' },
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${step.color} mt-2 flex-shrink-0`} />
                    <span className="text-base leading-relaxed">{step.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className="max-w-6xl mx-auto px-6">
        <svg viewBox="0 0 1200 2" className="w-full">
          <line x1="0" y1="1" x2="1200" y2="1" stroke="#E5E5E0" strokeWidth="1" />
        </svg>
      </div>

      {/* ─── Features ─── */}
      <section className="py-28 sm:py-40 px-6 sm:px-10">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-medium tracking-widest uppercase text-accent mb-6">
            Capabilities
          </p>
          <h2 className="font-[family-name:var(--font-serif)] text-[clamp(2rem,3.5vw,3rem)] leading-tight mb-20 max-w-xl">
            Everything you need to stay ahead of the narrative
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                ),
                title: 'Bill Tracking',
                desc: 'Monitor legislation across all 50 states. Filter by topic, committee, sponsor, or keyword. Know the moment a bill moves.',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                  </svg>
                ),
                title: 'Media Monitoring',
                desc: 'Scan Politico Pro, Bloomberg Government, local press, trade publications. Paywalled or not, we get the signal.',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                  </svg>
                ),
                title: 'Sentiment Analysis',
                desc: 'AI detects how stories frame legislation. Supportive, hostile, neutral. Track narrative shifts over time.',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                ),
                title: 'Journalist Database',
                desc: 'Auto-build a contact list from who covers your issues. See their outlet, beat, recent articles, and sentiment.',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                ),
                title: 'Coverage Attribution',
                desc: 'Connect the dots between media mentions and legislative action. See which stories move bills.',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                ),
                title: 'Cross-State Patterns',
                desc: 'Identical bills appearing in multiple states? We catch coordinated campaigns before they become trends.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass-card p-8 hover:bg-white/70 transition-all duration-300 group"
              >
                <div className="text-accent mb-5 group-hover:scale-110 transition-transform origin-left">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-lg mb-3">{feature.title}</h3>
                <p className="text-muted text-[15px] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof Quote ─── */}
      <section className="py-28 sm:py-36 px-6 sm:px-10 bg-cream-100">
        <div className="max-w-4xl mx-auto text-center">
          <svg className="w-12 h-12 text-accent/20 mx-auto mb-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609L9.978 5.151c-2.432.917-3.995 3.638-3.995 5.849H10v10H0z" />
          </svg>
          <blockquote className="font-[family-name:var(--font-serif)] text-[clamp(1.5rem,3vw,2.25rem)] leading-snug mb-10">
            I got tired of paying $2,000 a month for Meltwater and still missing coverage that mattered. PolicyFront catches what the big platforms miss.
          </blockquote>
          <div>
            <div className="font-semibold text-base">Sam Romain</div>
            <div className="text-sm text-muted mt-1">Public Affairs Manager, Sunrun</div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-28 sm:py-40 px-6 sm:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-sm font-medium tracking-widest uppercase text-accent mb-6">
              Pricing
            </p>
            <h2 className="font-[family-name:var(--font-serif)] text-[clamp(2rem,3.5vw,3rem)] leading-tight">
              Plans that scale with your portfolio
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Solo */}
            <div className="glass-card p-8 sm:p-10 flex flex-col">
              <div className="mb-8">
                <h3 className="font-[family-name:var(--font-serif)] text-2xl mb-2">Solo</h3>
                <p className="text-sm text-muted">For individual PA professionals</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-bold tracking-tight">$49</span>
                <span className="text-muted ml-1">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {['5 topics tracked', '2 states', 'Telegram alerts', 'Daily digest email'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-[15px]">
                    <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Professional */}
            <div className="glass-card p-8 sm:p-10 flex flex-col ring-2 ring-near-black relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-near-black text-cream-50 text-xs font-semibold px-4 py-1.5 rounded-full tracking-wide uppercase">
                  Most Popular
                </span>
              </div>
              <div className="mb-8">
                <h3 className="font-[family-name:var(--font-serif)] text-2xl mb-2">Professional</h3>
                <p className="text-sm text-muted">For teams managing multiple issues</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-bold tracking-tight">$149</span>
                <span className="text-muted ml-1">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {['25 topics tracked', 'All 50 states', 'Sentiment analysis', 'Export reports', 'Priority support'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-[15px]">
                    <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Agency */}
            <div className="glass-card p-8 sm:p-10 flex flex-col">
              <div className="mb-8">
                <h3 className="font-[family-name:var(--font-serif)] text-2xl mb-2">Agency</h3>
                <p className="text-sm text-muted">For firms and consultancies</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-bold tracking-tight">$499</span>
                <span className="text-muted ml-1">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {['Unlimited topics', 'All 50 states', 'Multi-user access', 'API access', 'White-label reports'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-[15px]">
                    <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-center text-sm text-light-muted mt-8">
            Join the waitlist to lock in early-access pricing.
          </p>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section id="waitlist" className="py-28 sm:py-36 px-6 sm:px-10 bg-near-black text-cream-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-[family-name:var(--font-serif)] text-[clamp(2rem,4vw,3.5rem)] leading-tight mb-6">
            The story is already being written.
          </h2>
          <p className="text-cream-200 text-lg sm:text-xl mb-10 leading-relaxed">
            Join the waitlist. Be first to know when we launch.
          </p>
          <div className="flex justify-center">
            <WaitlistForm variant="dark" />
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-16 px-6 sm:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-16">
            <div className="sm:col-span-2 md:col-span-1">
              <div className="font-[family-name:var(--font-serif)] text-xl mb-3">PolicyFront</div>
              <p className="text-sm text-muted leading-relaxed">
                The front line for<br />policy intelligence.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-light-muted">Product</h4>
              <ul className="space-y-3">
                {['Features', 'Pricing', 'Changelog'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted hover:text-near-black transition">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-light-muted">Company</h4>
              <ul className="space-y-3">
                {['About', 'Contact', 'Privacy', 'Terms'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted hover:text-near-black transition">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-light-muted">Connect</h4>
              <ul className="space-y-3">
                {['Twitter', 'LinkedIn', 'Email'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted hover:text-near-black transition">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-light-muted">© 2026 PolicyFront. All rights reserved.</p>
            <p className="text-xs text-light-muted">Washington, DC</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
