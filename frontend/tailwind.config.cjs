/************ keep ************/
/** Tailwind setup **/
/************ keep ************/
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "sans-serif"]
      },
      colors: {
        primary: {
          DEFAULT: "#5E8BFF",
          100: "#7FDBDA"
        },
        surface: "#0F162E",
        card: "rgba(255,255,255,0.06)",
        "card-border": "rgba(255,255,255,0.12)",
        "muted-text": "#DDE4FF"
      },
      boxShadow: {
        glass: "0 10px 30px rgba(0,0,0,0.35)"
      },
      backdropBlur: {
        lg: "20px"
      },
      animation: {
        float: "float 6s ease-in-out infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" }
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};
