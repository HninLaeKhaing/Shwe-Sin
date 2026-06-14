import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--background)',
        fg: 'var(--foreground)',
        card: 'var(--card)',
        soft: 'var(--soft)',
        brand: 'var(--brand)',
        brandStrong: 'var(--brand-strong)',
      },
      boxShadow: {
        glow: '0 24px 60px rgba(23, 110, 92, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
