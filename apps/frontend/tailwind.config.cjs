/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      /* ============================================
         COLORS — OKLCH Design System
         ============================================ */
      colors: {
        // Background layers
        bg: {
          main: "var(--bg-main)",
          subtle: "var(--bg-subtle)",
          elevated: "var(--bg-elevated)",
        },
        // Surface layers
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        // Border colors
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
          hover: "var(--border-hover)",
        },
        // Text colors
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          faint: "var(--text-faint)",
        },
        // Accent — refined cyan
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          active: "var(--accent-active)",
          muted: "var(--accent-muted)",
          subtle: "var(--accent-subtle)",
          glow: "var(--accent-glow)",
        },
        // Status colors — semantic
        success: {
          DEFAULT: "var(--success)",
          muted: "var(--success-muted)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          muted: "var(--warning-muted)",
        },
        error: {
          DEFAULT: "var(--error)",
          muted: "var(--error-muted)",
        },
        info: {
          DEFAULT: "var(--info)",
          muted: "var(--info-muted)",
        },
      },

      /* ============================================
         GEOMETRY — Radii & Shadows
         ============================================ */
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },

      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        elevated: "var(--shadow-elevated)",
        inner: "var(--shadow-inner)",
        glow: "var(--glow-accent)",
        "glow-success": "var(--glow-success)",
        "glow-error": "var(--glow-error)",
      },

      /* ============================================
         TYPOGRAPHY — Space Grotesk + Plus Jakarta Sans
         ============================================ */
      fontFamily: {
        sans: ["var(--font-sans)", { fontFeatureSettings: '"ss01", "ss02", "cv01"' }],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },

      fontSize: {
        // Fluid type scale
        "2xs": ["var(--text-2xs)", { lineHeight: "1rem" }],
        xs: ["var(--text-xs)", { lineHeight: "1.25rem" }],
        sm: ["var(--text-sm)", { lineHeight: "1.5rem" }],
        base: ["var(--text-base)", { lineHeight: "1.6" }],
        lg: ["var(--text-lg)", { lineHeight: "1.6" }],
        xl: ["var(--text-xl)", { lineHeight: "1.75rem" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "2rem" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "2.25rem" }],
        "4xl": ["var(--text-4xl)", { lineHeight: "1.1" }],
      },

      letterSpacing: {
        tighter: "-0.03em",
        tight: "-0.02em",
        normal: "-0.01em",
        wide: "0.02em",
        wider: "0.08em",
        widest: "0.12em",
      },

      lineHeight: {
        tighter: "1.1",
        tight: "1.2",
        snug: "1.4",
        normal: "1.6",
        relaxed: "1.8",
      },

      /* ============================================
         SPACING — Rhythmic fluid scale
         ============================================ */
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
      },

      /* ============================================
         ANIMATION — Purposeful motion
         ============================================ */
      transitionDuration: {
        instant: "var(--duration-instant)",
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
        slower: "var(--duration-slower)",
      },

      transitionTimingFunction: {
        "ease-out": "var(--ease-out)",
        "ease-out-expo": "var(--ease-out-expo)",
        "ease-in-out": "var(--ease-in-out)",
        spring: "var(--ease-spring)",
        bounce: "var(--ease-bounce)",
      },

      animation: {
        // Entrances
        "fade-in": "fadeIn var(--duration-normal) var(--ease-out) forwards",
        "slide-up": "slideUp var(--duration-normal) var(--ease-out) forwards",
        "slide-in-left": "slideInLeft var(--duration-normal) var(--ease-out) forwards",
        "slide-in-right": "slideInRight var(--duration-normal) var(--ease-out) forwards",
        "scale-in": "scaleIn var(--duration-fast) var(--ease-spring) forwards",
        // Continuous
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        spin: "spin 0.8s linear infinite",
        "spin-slow": "spin 8s linear infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
      },

      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },

      /* ============================================
         Z-INDEX — Purposeful scale
         ============================================ */
      zIndex: {
        base: "0",
        dropdown: "100",
        sticky: "200",
        fixed: "300",
        overlay: "400",
        modal: "500",
        popover: "600",
        tooltip: "700",
      },

      /* ============================================
         SCREENS — Responsive breakpoints
         ============================================ */
      screens: {
        xs: "480px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
  },
  plugins: [],
};

