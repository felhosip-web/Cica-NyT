/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts}"],
  theme: {
    extend: {
      colors: {
        primary: '#ff6b9d',
        brand: {
          pink: '#FF69B4',
          orange: '#FFA500'
        }
      }
    },
  },
  plugins: [],
}
