/** @type {import('tailwindcss').Config} */
module.exports = {
  // 確保這裡包含 app 和 components 資料夾
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pikmin: {
          red: '#E84A41',
          yellow: '#F4D03F',
          blue: '#3498DB',
          leaf: '#78B159',
          earth: '#5D4037',
          bg: '#FEF9E7',
          dark: '#2C3E50',
          gray: '#BDC3C7',
        },
      },
      fontFamily: {
        pixel: ['PressStart2P_400Regular'], 
      },
    },
  },
  plugins: [],
}