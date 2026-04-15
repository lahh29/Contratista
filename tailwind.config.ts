import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        /* SF Pro on Apple devices, Inter as web fallback */
        display: [
          'SF Pro Display', '-apple-system', 'BlinkMacSystemFont',
          'Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif',
        ],
        body: [
          'SF Pro Text', '-apple-system', 'BlinkMacSystemFont',
          'Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif',
        ],
        headline: [
          'SF Pro Display', '-apple-system', 'BlinkMacSystemFont',
          'Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif',
        ],
        code: ['SF Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        /* Apple typography scale */
        'hero':    ['3.5rem',   { lineHeight: '1.07', letterSpacing: '-0.02em', fontWeight: '600' }],
        'section': ['2.5rem',   { lineHeight: '1.10', letterSpacing: '0',       fontWeight: '600' }],
        'tile':    ['1.75rem',  { lineHeight: '1.14', letterSpacing: '0.007em', fontWeight: '400' }],
        'card-t':  ['1.3125rem',{ lineHeight: '1.19', letterSpacing: '0.011em', fontWeight: '700' }],
        'subhead': ['1.3125rem',{ lineHeight: '1.19', letterSpacing: '0.011em', fontWeight: '400' }],
        'body-lg': ['1.0625rem',{ lineHeight: '1.47', letterSpacing: '-0.022em', fontWeight: '400' }],
        'caption': ['0.875rem', { lineHeight: '1.29', letterSpacing: '-0.016em', fontWeight: '400' }],
        'micro':   ['0.75rem',  { lineHeight: '1.33', letterSpacing: '-0.01em',  fontWeight: '400' }],
        'nano':    ['0.625rem', { lineHeight: '1.47', letterSpacing: '-0.005em', fontWeight: '400' }],
      },
      letterSpacing: {
        'apple-tight': '-0.022em',
        'apple-display': '-0.02em',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
