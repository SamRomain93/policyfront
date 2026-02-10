import Link from 'next/link'

export default function SiteFooter() {
  return (
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
              <li><Link href="/#features" className="text-sm text-muted hover:text-near-black transition">Features</Link></li>
              <li><Link href="/#pricing" className="text-sm text-muted hover:text-near-black transition">Pricing</Link></li>
              <li><span className="text-sm text-light-muted">Changelog</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-light-muted">Company</h4>
            <ul className="space-y-3">
              <li><span className="text-sm text-light-muted">About</span></li>
              <li><span className="text-sm text-light-muted">Contact</span></li>
              <li><Link href="/privacy" className="text-sm text-muted hover:text-near-black transition">Privacy</Link></li>
              <li><Link href="/terms" className="text-sm text-muted hover:text-near-black transition">Terms</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-light-muted">Connect</h4>
            <ul className="space-y-3">
              <li><span className="text-sm text-light-muted">Twitter</span></li>
              <li><span className="text-sm text-light-muted">LinkedIn</span></li>
              <li><span className="text-sm text-light-muted">Email</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-light-muted">© 2026 PolicyFront. All rights reserved.</p>
          <p className="text-xs text-light-muted">Washington, DC</p>
        </div>
      </div>
    </footer>
  )
}
