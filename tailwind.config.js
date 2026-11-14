/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'bg-screen': '#fff9fb',
        'bg-btn': '#8f7161',
        'text-btn': '#ffffff',
        'bg-main': '#ffffff',
        'bg-card': '#ffffff',
        'text-main': '#8f7161',
        'text-sub': '#8f7161',
        'accent-primary': '#8f7161',
        'accent-secondary': '#ffdac1',
        'border-main': '#f0e6e6',
      }
    },
  },
  plugins: [],
}
