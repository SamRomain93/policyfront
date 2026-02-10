import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FAFAF8',
          100: '#F5F5F0',
          200: '#F0EDE6',
        },
        'near-black': '#1A1A1A',
        muted: '#6B6B6B',
        'light-muted': '#9B9B9B',
        accent: '#2563EB',
        border: '#E5E5E0',
      },
      fontFamily: {
        serif: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'hero': 'clamp(3rem, 5vw, 5rem)',
        'section': 'clamp(2rem, 3vw, 3rem)',
      },
      spacing: {
        'section': 'clamp(5rem, 10vw, 10rem)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
export default config
