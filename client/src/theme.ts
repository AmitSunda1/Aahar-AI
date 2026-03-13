/**
 * Aahar AI — Design System Theme Tokens
 * Tailwind v4 compatible | Light Theme Only
 * Max screen width: 450px (mobile-first)
 *
 * Usage in your CSS entry file:
 *   @import "tailwindcss";
 *   @import "./theme.js" // if using CSS-in-JS pipeline
 *
 * Or reference these tokens inside tailwind.config.ts:
 *   import { theme } from "./theme.js"
 *   export default { theme: { extend: theme } }
 */

export const theme = {

    // ─────────────────────────────────────────────
    // SCREENS — Mobile-first, max 450px
    // ─────────────────────────────────────────────
    screens: {
        /** Only one breakpoint — this is a mobile-first app */
        app: "450px",
    },

    // ─────────────────────────────────────────────
    // COLORS
    // ─────────────────────────────────────────────
    colors: {
        /** Color / Base */
        base: {
            white: "#FFFFFF",
            black: "#0B0B0B",
        },

        /** Color / Grey */
        grey: {
            900: "#1C1C1E",
            700: "#4A4A4A",
            500: "#8E8E93",
            300: "#D1D1D6",
            100: "#F2F2F7",
        },

        /** Color / Accent — use sparingly, functional only */
        accent: {
            primary: "#0B5FFF",
        },

        /** Color / Semantic */
        semantic: {
            success: "#1DB954",
            warning: "#FF9500",
            error: "#FF3B30",
        },

        /** Color / Nutrition — macro tracking */
        nutrition: {
            protein: "#1DB954",
            carbs: "#0B5FFF",
            fat: "#FF9500",
        },
    },

    // ─────────────────────────────────────────────
    // TYPOGRAPHY
    // ─────────────────────────────────────────────
    fontFamily: {
        /** Text / Primary */
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
    },

    fontSize: {
        /**
         * Format: [fontSize, { lineHeight, fontWeight }]
         * Mirrors the Aahar text style naming system.
         */

        /** Text / H1 */
        "h1": ["28px", { lineHeight: "36px", fontWeight: "600" }],

        /** Text / H2 */
        "h2": ["22px", { lineHeight: "30px", fontWeight: "600" }],

        /** Text / H3 */
        "h3": ["18px", { lineHeight: "26px", fontWeight: "500" }],

        /** Text / Body / Large */
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],

        /** Text / Body / Default */
        "body": ["14px", { lineHeight: "22px", fontWeight: "400" }],

        /** Text / Body / Small */
        "body-sm": ["13px", { lineHeight: "20px", fontWeight: "400" }],

        /** Text / Label / Large */
        "label-lg": ["14px", { lineHeight: "20px", fontWeight: "500" }],

        /** Text / Label / Small */
        "label-sm": ["12px", { lineHeight: "16px", fontWeight: "500" }],

        /** Text / Caption */
        "caption": ["11px", { lineHeight: "14px", fontWeight: "400" }],
    },

    // ─────────────────────────────────────────────
    // SPACING — 8pt grid system
    // Only these values are permitted in the design system.
    // ─────────────────────────────────────────────
    spacing: {
        /** 4px — micro */
        "micro": "4px",

        /** 8px — inline */
        "inline": "8px",

        /** 12px — compact */
        "compact": "12px",

        /** 16px — default */
        "default": "16px",

        /** 24px — section */
        "section": "24px",

        /** 32px — large section */
        "section-lg": "32px",

        // Numeric aliases (same values) — for ergonomic className usage
        // e.g. p-1 = 4px, p-2 = 8px, p-3 = 12px, p-4 = 16px, p-6 = 24px, p-8 = 32px
        "0": "0px",
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "6": "24px",
        "8": "32px",
    },

    // ─────────────────────────────────────────────
    // BORDER RADIUS
    // ─────────────────────────────────────────────
    borderRadius: {
        "none": "0px",

        /** Inputs, Buttons → 12px */
        "input": "12px",

        /** Cards → 16px */
        "card": "16px",

        /** Chat bubbles → 16px */
        "bubble": "16px",

        /** Pill / full round */
        "full": "9999px",

        // Tailwind semantic aliases
        "sm": "8px",
        "md": "12px",
        "lg": "16px",
        "xl": "20px",
        "2xl": "24px",
    },

    // ─────────────────────────────────────────────
    // BOX SHADOWS
    // ─────────────────────────────────────────────
    boxShadow: {
        /** Card / Default — subtle elevation */
        "card": "0px 4px 12px rgba(0, 0, 0, 0.04)",

        /** Card / Raised — action cards */
        "card-md": "0px 6px 20px rgba(0, 0, 0, 0.07)",

        /** Card / High — modals / sheets */
        "card-lg": "0px 12px 32px rgba(0, 0, 0, 0.10)",

        /** Warning tint — medical warning backgrounds */
        "warning-ring": "0 0 0 1px rgba(255, 149, 0, 0.20)",

        /** Error ring — input error state */
        "error-ring": "0 0 0 1.5px #FF3B30",

        /** Focus ring — input focus state */
        "focus-ring": "0 0 0 1.5px #0B0B0B",

        "none": "none",
    },

    // ─────────────────────────────────────────────
    // MAX WIDTH — enforce 450px container
    // ─────────────────────────────────────────────
    maxWidth: {
        "app": "450px",
    },

};

export default theme;
