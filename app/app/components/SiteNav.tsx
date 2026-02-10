import Link from 'next/link'

export default function SiteNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cream-50/80 border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-4 flex justify-between items-center">
        <Link href="/" className="font-[family-name:var(--font-serif)] text-2xl tracking-tight">
          PolicyFront
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/#pricing" className="text-sm text-muted hover:text-near-black transition hidden sm:block">
            Pricing
          </Link>
          <Link href="/login" className="text-sm font-medium text-muted hover:text-near-black transition">
            Log In
          </Link>
          <Link href="/#waitlist" className="bg-near-black text-cream-50 text-sm font-medium px-5 py-2.5 rounded-full hover:bg-near-black/85 transition">
            Join Waitlist
          </Link>
        </div>
      </div>
    </nav>
  )
}
