/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      // ============================================
      // Typography — Standardized Scale
      // ============================================
      fontSize: {
        // Base scale (12→32px, step by 2px)
        xs: ["12px", { lineHeight: "16px", letterSpacing: "-0.01em" }],
        sm: ["14px", { lineHeight: "20px", letterSpacing: "0" }],
        base: ["16px", { lineHeight: "24px", letterSpacing: "0" }],
        lg: ["18px", { lineHeight: "26px", letterSpacing: "-0.01em" }],
        xl: ["20px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        "2xl": ["22px", { lineHeight: "30px", letterSpacing: "-0.02em" }],
        "3xl": ["24px", { lineHeight: "32px", letterSpacing: "-0.02em" }],
        "4xl": ["28px", { lineHeight: "36px", letterSpacing: "-0.03em" }],
        "5xl": ["32px", { lineHeight: "40px", letterSpacing: "-0.03em" }],
      },
      fontFamily: {
        sans: ["BeVietnamPro-Regular"],
        medium: ["BeVietnamPro-Medium"],
        semibold: ["BeVietnamPro-SemiBold"],
        bold: ["BeVietnamPro-Bold"],
        extrabold: ["BeVietnamPro-ExtraBold"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        border: "var(--border)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        danger: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#00A73D",
          foreground: "#FFFFFF",
        }
      },
    },
  },
  plugins: [],
};
