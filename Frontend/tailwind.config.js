/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  "#f0f4f8",
          100: "#d9e4ef",
          200: "#b3c9df",
          300: "#7fa8cc",
          400: "#5a8ab8",
          500: "#3a6fa3",
          600: "#2d5a8e",
          700: "#1e3a5f",
          800: "#152b46",
          900: "#0c1c2e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["10px", "14px"],
        xs:   ["11px", "16px"],
        sm:   ["12px", "18px"],
        base: ["13px", "20px"],
        md:   ["14px", "22px"],
        lg:   ["15px", "24px"],
        xl:   ["16px", "26px"],
        "2xl":["18px", "28px"],
        "3xl":["20px", "30px"],
        "4xl":["24px", "32px"],
      },
    },
  },
  plugins: [],
};