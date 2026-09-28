/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

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
        csk: {
          yellow: '#FDB913',
          yellowDark: '#E0A100',
          blue: '#002B49',
          blueDark: '#001A2C',
          lightBlue: '#1A5B8C',
          slate: '#0F172A',
        }
      }
    },
  },
  plugins: [],
}