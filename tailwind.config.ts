import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        paper: "#f6f2ea",
        pine: "#24514a",
        coral: "#d76147",
        saffron: "#e6aa32",
        skywash: "#d8edf2",
        graphite: "#2d3035"
      },
      boxShadow: {
        soft: "0 18px 45px rgb(23 32 38 / 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
