import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        highlight: {
          DEFAULT: "hsl(var(--highlight))",
          foreground: "hsl(var(--highlight-foreground))",
        },
        ink: {
          DEFAULT: "hsl(var(--foreground))",
          muted: "hsl(var(--muted-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--card))",
          subtle: "hsl(var(--muted))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        lift: "0 1px 2px hsl(var(--foreground) / 0.04), 0 8px 24px hsl(var(--foreground) / 0.04)",
      },
      transitionDuration: {
        fast: "180ms",
      },
    },
  },
  plugins: [],
};

export default config;
