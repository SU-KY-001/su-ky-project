/** @type {import('tailwindcss').Config} */
const path = require("node:path");

module.exports = {
  content: [path.join(__dirname, "src/**/*.{js,jsx,ts,tsx}").replace(/\\/g, "/")],
  presets: [require("nativewind/preset")],
  theme: { extend: {} },
  plugins: [],
};
