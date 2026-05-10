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
          navy: '#064372', // Darkest navy blue
          blue: '#308cd6', // Medium blue
          gold: '#589efc', // Replaced gold with the brightest light blue for highlight
          sky: '#6cb7e9',  // Light sky blue
          pale: '#9bcdf1', // Pale sky blue
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        }
      },
      animation: {
        blob: "blob 7s infinite",
      }
    },
  },
  plugins: [],
}