/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090E',
        surface: '#131318',
        primary: '#CCFF00', // Electric Lime
        'primary-dim': '#A3CC00',
        secondary: '#FF007F', // Cyber Pink
        'surface-glass': 'rgba(255, 255, 255, 0.05)',
        'surface-border': 'rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        'bento': '24px',
        'bento-lg': '32px',
        'pill': '9999px',
      },
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        body: ['Sora', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(204, 255, 0, 0.3)',
        'glow-secondary': '0 0 20px rgba(255, 0, 127, 0.3)',
      }
    },
  },
  plugins: [],
}