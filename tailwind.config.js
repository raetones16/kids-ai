/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        asap: ["Asap", "sans-serif"],
        "asap-condensed": ["Asap Condensed", "sans-serif"],
        arvo: ["Arvo", "serif"],
        sans: ["Asap", "sans-serif"], // Override the default sans font
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Grey scale
        grey: {
          10: "hsl(var(--grey-10))",
          20: "hsl(var(--grey-20))",
          30: "hsl(var(--grey-30))",
          40: "hsl(var(--grey-40))",
          50: "hsl(var(--grey-50))",
          60: "hsl(var(--grey-60))",
          70: "hsl(var(--grey-70))",
          80: "hsl(var(--grey-80))",
          90: "hsl(var(--grey-90))",
          100: "hsl(var(--grey-100))",
        },

        // Orange scale
        orange: {
          10: "hsl(var(--orange-10))",
          20: "hsl(var(--orange-20))",
          30: "hsl(var(--orange-30))",
          40: "hsl(var(--orange-40))",
          50: "hsl(var(--orange-50))",
          60: "hsl(var(--orange-60))",
          70: "hsl(var(--orange-70))",
          80: "hsl(var(--orange-80))",
          90: "hsl(var(--orange-90))",
          100: "hsl(var(--orange-100))",
        },

        // State colors for animations
        state: {
          listening: "hsl(var(--state-listening))",
          thinking: "hsl(var(--state-thinking))",
          speaking: "hsl(var(--state-speaking))",
          searching: "hsl(var(--state-searching))",
          idle: "hsl(var(--state-idle))",
        },

        // Standard interface colors
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      boxShadow: {
        large: "var(--shadow-large)",
        medium: "var(--shadow-medium)",
        small: "var(--shadow-small)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
