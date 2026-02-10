import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PolicyFront — Policy intelligence for public affairs',
  description: 'Track legislation and media coverage in one place. Built for public affairs professionals who need to stay ahead of the narrative.',
  openGraph: {
    title: 'PolicyFront — Policy intelligence for public affairs',
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain">
        {children}
      </body>
    </html>
  )
}
