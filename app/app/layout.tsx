import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PolicyFront - Policy intelligence for public affairs',
  description: 'Track legislation and media coverage in one place. Built for public affairs professionals who need to stay ahead of the narrative.',
  openGraph: {
    title: 'PolicyFront - Policy intelligence for public affairs',
    description: 'Track legislation and media coverage in one place.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Instrument Serif not available in next/font, load via Google Fonts CSS */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain">
        {children}
      </body>
    </html>
  )
}
