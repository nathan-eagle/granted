import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        bellota: ['var(--font-bellota)'],
        roboto: ['var(--font-roboto)'],
      },
    },
  },
  plugins: [],
}
export default config

