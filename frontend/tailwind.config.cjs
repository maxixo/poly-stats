module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0b0f1a",
        panel: "#121827",
        neon: "#7df9ff",
        nebula: "#9b5cff",
        pulse: "#00f0ff"
      },
      boxShadow: {
        glass: "0 20px 60px rgba(0, 0, 0, 0.45)",
        glow: "0 0 25px rgba(125, 249, 255, 0.25)"
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        mono: ["Space Mono", "monospace"]
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" }
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.65" },
          "50%": { opacity: "1" }
        },
        reveal: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        pulseGlow: "pulseGlow 5s ease-in-out infinite",
        reveal: "reveal 0.6s ease-out"
      },
      backgroundImage: {
        "mesh": "radial-gradient(circle at top, rgba(125, 249, 255, 0.18), transparent 55%), radial-gradient(circle at 30% 20%, rgba(155, 92, 255, 0.18), transparent 50%), radial-gradient(circle at 80% 0%, rgba(0, 240, 255, 0.12), transparent 45%)"
      }
    }
  },
  plugins: []
};
