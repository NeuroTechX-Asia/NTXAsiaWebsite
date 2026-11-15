/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "muted-foreground": "var(--muted-foreground)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        "neuro-accent": "var(--neuro-accent)",
        "neuro-accent-strong": "var(--neuro-accent-strong)",
      },
      fontFamily: {
        sans: ["Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "system-ui", "sans-serif"],
        display: ["Aldrich", "Inter", "PingFang SC", "Microsoft YaHei", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px var(--neuro-accent-glow)",
        card: "0 18px 45px -25px rgba(0,0,0,.85)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
    },
  },
  plugins: [],
};
