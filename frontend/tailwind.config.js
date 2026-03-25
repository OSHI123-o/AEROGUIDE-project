/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aeroguide: {
          navy: '#002B5B', // Your brand navy
          blue: '#1E40AF', // The bright flight blue used for buttons
          gold: '#FDB913', // Your brand gold
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}