/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./dist/**/*.{html,js}", "./js/**/*.{html,js}"],
  safelist: [
    "bg-customBlue", // Add any dynamically generated classes here
  ],
  theme: {
    extend: {
      colors: {
        customBlue: "#18307b",
      },
    },
  },
  plugins: [],
};
