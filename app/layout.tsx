import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

// Instrument Serif via CDN (Google Fonts doesn't have it in next/font yet)
export const metadata: Metadata = {
  title: 'PolicyFront - The front line for policy intelligence',
  description: 'Track bills. Monitor media. Stay ahead of the narrative.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-cream-50 text-near-black">
        {children}
      </body>
    </html>
  )
}
