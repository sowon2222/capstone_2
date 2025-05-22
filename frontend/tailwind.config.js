/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(15,15,15)",      // 다크 배경
        foreground: "rgb(255,255,255)",   // 흰색 글씨
        // 필요하다면 border, card 등도 추가
      },
    },
  },
  plugins: [],
}

