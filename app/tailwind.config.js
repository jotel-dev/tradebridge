/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { background: "#0A0D16", surface: "#1B1D29", border: "#363844", primary: "#3B82F6", success: "#35A66F", warning: "#C88A2D", danger: "#C85C5C" }, fontFamily: { sans: ["Space Grotesk", "sans-serif"], mono: ["JetBrains Mono", "monospace"] } } },
  plugins: [],
};
