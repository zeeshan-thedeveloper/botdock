import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17201b',
        moss: '#54705d',
        mint: '#dff3e7',
        coral: '#ff7f6e',
      },
    },
  },
  plugins: [],
};

export default config;
