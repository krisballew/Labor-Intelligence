/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "teal-dark": "#0D5463",
        "teal": "#1B7A8A",
        "teal-light": "#2A9DAD",
        "orange": "#E85D1F",
        "orange-light": "#F5A623",
        "slate-navy": "#1F2937",
      },
    },
  },
  plugins: [],
}
