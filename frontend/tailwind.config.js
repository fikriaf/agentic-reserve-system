/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1152d4",
        "background-light": "#f6f6f8",
        "background-dark": "#0a0a0a",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0px",
        lg: "0px",
        xl: "0px",
      },
    },
  },
  plugins: [],
};
