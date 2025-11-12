/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6366F1",
          dark: "#4338CA",
        },
      },
    },
  },
  plugins: [],
};

