/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1a73e8',
        secondary: '#34a853',
        accent: '#fbbc04',
        danger: '#ea4335'
      }
    }
  },
  plugins: []
}
