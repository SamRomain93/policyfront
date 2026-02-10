export default function Home() {
  return (
    <main>
      {/* Navigation */}
      <nav className="py-6 px-8 flex justify-between items-center">
        <div className="font-serif font-bold text-2xl">PolicyFront</div>
        <div className="flex gap-4">
          <button className="text-muted hover:text-near-black transition">Sign In</button>
          <button className="bg-accent text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition">
            Start Free Trial
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-section px-8 text-center max-w-5xl mx-auto">
        <h1 className="font-serif font-bold text-hero leading-tight mb-8">
          The front line for<br />policy intelligence
        </h1>
        <p className="text-xl text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
          Track bills. Monitor media. Stay ahead of the narrative.
        </p>
        <button className="bg-accent text-white px-8 py-4 rounded-lg text-lg hover:bg-blue-600 transition inline-flex items-center gap-2">
          Get Early Access
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Logo Carousel */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-light-muted mb-6">Used by public affairs professionals at</p>
          <div className="flex justify-center gap-12 items-center opacity-60">
            <div className="text-lg font-medium">Sunrun</div>
            <div className="text-lg font-medium">FlaSEIA</div>
            <div className="text-lg font-medium">RPOF</div>
            <div className="text-lg font-medium">Athos</div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-section px-8 bg-cream-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif font-bold text-section mb-8">The old way is broken</h2>
          <p className="text-xl text-muted leading-relaxed mb-6">
            You're juggling LegiScan for bills, Google Alerts for news,
            and spreadsheets to connect the dots.
          </p>
          <p className="text-xl font-medium">
            PolicyFront does it all in one place.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-section px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif font-bold text-section text-center mb-16">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                number: '1',
                title: 'Track',
                description: 'Tell us what bills and topics matter to you'
              },
              {
                number: '2',
                title: 'Monitor',
                description: 'We scan news from paywalled sources + open media'
              },
              {
                number: '3',
                title: 'Alert',
                description: 'Get Telegram alerts the moment coverage drops'
              }
            ].map((step) => (
              <div 
                key={step.number}
                className="bg-white/60 backdrop-blur-sm rounded-xl p-8 hover:bg-white/80 transition border border-border"
              >
                <div className="font-serif text-6xl font-bold text-accent mb-4">{step.number}</div>
                <h3 className="font-semibold text-2xl mb-3">{step.title}</h3>
                <p className="text-muted leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-section px-8 bg-cream-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif font-bold text-section text-center mb-16">
            What you get with PolicyFront
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Bill Tracking',
                description: 'Monitor bills by state or topic'
              },
              {
                title: 'Media Monitoring',
                description: 'Scan Politico Pro, Bloomberg Gov, local press, and more'
              },
              {
                title: 'Sentiment Analysis',
                description: 'AI-powered framing detection shows how stories shift'
              },
              {
                title: 'Journalist Database',
                description: 'Build contacts from coverage'
              },
              {
                title: 'Coverage Attribution',
                description: 'Link media mentions to bill movements'
              },
              {
                title: 'Cross-State Patterns',
                description: 'Spot coordination across states'
              }
            ].map((feature) => (
              <div 
                key={feature.title}
                className="bg-white rounded-xl p-6 border-l-4 border-accent"
              >
                <h3 className="font-semibold text-xl mb-3">{feature.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-section px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif font-bold text-section text-center mb-16">Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Solo',
                price: '$49',
                period: '/mo',
                features: [
                  '5 topics tracked',
                  '2 states',
                  'Telegram alerts',
                  'Daily digest'
                ],
                cta: 'Start Free Trial',
                popular: false
              },
              {
                name: 'Professional',
                price: '$149',
                period: '/mo',
                features: [
                  '25 topics',
                  'All 50 states',
                  '+ Sentiment analysis',
                  '+ Export reports'
                ],
                cta: 'Start Free Trial',
                popular: true
              },
              {
                name: 'Agency',
                price: '$499',
                period: '/mo',
                features: [
                  'Unlimited topics',
                  'All 50 states',
                  '+ Multi-user',
                  '+ API access',
                  '+ White-label'
                ],
                cta: 'Contact Sales',
                popular: false
              }
            ].map((tier) => (
              <div 
                key={tier.name}
                className={`bg-white rounded-xl p-8 border border-border ${tier.popular ? 'ring-2 ring-accent shadow-lg scale-105' : ''}`}
              >
                {tier.popular && (
                  <div className="text-accent text-sm font-semibold mb-4">MOST POPULAR</div>
                )}
                <h3 className="font-serif text-3xl font-bold mb-2">{tier.name}</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold">{tier.price}</span>
                  <span className="text-muted">{tier.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="text-muted flex items-start gap-2">
                      <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-lg font-medium transition ${
                  tier.popular 
                    ? 'bg-accent text-white hover:bg-blue-600' 
                    : 'bg-cream-100 text-near-black hover:bg-cream-200'
                }`}>
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-section px-8 bg-cream-100">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-12">
            <h2 className="font-serif font-bold text-section text-center mb-8">
              Built by a public affairs professional
            </h2>
            <blockquote className="font-serif italic text-2xl text-muted text-center mb-6 leading-relaxed">
              "I got tired of paying $2,000/month for Meltwater and still missing coverage.
              PolicyFront gives me everything I need for less than lunch."
            </blockquote>
            <div className="text-center">
              <div className="font-semibold">Sam Romain</div>
              <div className="text-sm text-muted">Public Affairs Manager, Sunrun</div>
              <div className="text-sm text-muted">Chairman, Polk County Republican Executive Committee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-section px-8 text-center">
        <h2 className="font-serif font-bold text-section mb-8">
          Ready to stay ahead of the story?
        </h2>
        <button className="bg-accent text-white px-8 py-4 rounded-lg text-lg hover:bg-blue-600 transition inline-flex items-center gap-2 mb-6">
          Get Early Access
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <p className="text-sm text-light-muted">
          No credit card required • Cancel anytime • 14-day free trial
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <div className="font-serif font-bold text-xl mb-2">PolicyFront</div>
            <p className="text-sm text-muted">The front line for policy intelligence</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><a href="#" className="hover:text-near-black transition">Features</a></li>
              <li><a href="#" className="hover:text-near-black transition">Pricing</a></li>
              <li><a href="#" className="hover:text-near-black transition">Roadmap</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><a href="#" className="hover:text-near-black transition">About</a></li>
              <li><a href="#" className="hover:text-near-black transition">Contact</a></li>
              <li><a href="#" className="hover:text-near-black transition">Privacy</a></li>
              <li><a href="#" className="hover:text-near-black transition">Terms</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm text-muted">© 2026 PolicyFront</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
