/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2F7A4F",     // Deep green (main)
          dark: "#1F5A3A",        // Darker green (hover states)
          light: "#D4EAD8",       // Lighter cream green (backgrounds/tints)
          muted: "#E8F5E9",       // Very light green (subtle backgrounds)
        },
        surface: {
          DEFAULT: "#FEFEFE",     // Near-white background
          card: "#FFFFFF",        // Pure white for cards
          dark: "#F5F7F6",        // Slightly tinted white for contrast areas
        },
        text: {
          primary: "#0F1A13",     // Almost black with green tint
          secondary: "#2D4536",   // Dark green-gray for secondary text
          muted: "#5A6B5F",       // Medium gray-green for muted text
          inverse: "#FFFFFF",     // White text on colored backgrounds
        },
      },
      boxShadow: {
        'card': '0 4px 20px rgba(47, 122, 79, 0.10)',
        'card-hover': '0 8px 30px rgba(47, 122, 79, 0.18)',
        'input': '0 2px 8px rgba(47, 122, 79, 0.06)',
      },
    },
  },
  plugins: [],
};
