import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--color-background) / <alpha-value>)',
        foreground: 'hsl(var(--color-foreground) / <alpha-value>)',
        muted: 'hsl(var(--color-muted) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--color-muted-foreground) / <alpha-value>)',
        surface: 'hsl(var(--color-surface) / <alpha-value>)',
        'surface-raised': 'hsl(var(--color-surface-raised) / <alpha-value>)',
        border: 'hsl(var(--color-border) / <alpha-value>)',
        input: 'hsl(var(--color-input) / <alpha-value>)',
        ring: 'hsl(var(--color-ring) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--color-primary) / <alpha-value>)',
          foreground: 'hsl(var(--color-primary-foreground) / <alpha-value>)',
          muted: 'hsl(var(--color-primary-muted) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--color-accent) / <alpha-value>)',
          foreground: 'hsl(var(--color-accent-foreground) / <alpha-value>)',
          muted: 'hsl(var(--color-accent-muted) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--color-success) / <alpha-value>)',
          foreground: 'hsl(var(--color-success-foreground) / <alpha-value>)',
          muted: 'hsl(var(--color-success-muted) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--color-warning) / <alpha-value>)',
          foreground: 'hsl(var(--color-warning-foreground) / <alpha-value>)',
          muted: 'hsl(var(--color-warning-muted) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'hsl(var(--color-danger) / <alpha-value>)',
          foreground: 'hsl(var(--color-danger-foreground) / <alpha-value>)',
          muted: 'hsl(var(--color-danger-muted) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: [
          'var(--font-mono)',
          'Geist Mono',
          'SFMono-Regular',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      spacing: {
        'app-gutter': 'var(--spacing-app-gutter)',
        'section-y': 'var(--spacing-section-y)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        'surface-sm': 'var(--shadow-surface-sm)',
        'surface-md': 'var(--shadow-surface-md)',
        focus: 'var(--shadow-focus)',
      },
    },
  },
  plugins: [],
};

export default config;
