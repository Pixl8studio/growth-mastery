import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: {
                DEFAULT: "1rem",
                sm: "1.5rem",
                lg: "2rem",
            },
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            spacing: {
                safe: "env(safe-area-inset-bottom)",
                "safe-top": "env(safe-area-inset-top)",
                "safe-left": "env(safe-area-inset-left)",
                "safe-right": "env(safe-area-inset-right)",
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
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
                sidebar: {
                    DEFAULT: "hsl(var(--sidebar-background))",
                    foreground: "hsl(var(--sidebar-foreground))",
                    primary: "hsl(var(--sidebar-primary))",
                    "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
                    accent: "hsl(var(--sidebar-accent))",
                    "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
                    border: "hsl(var(--sidebar-border))",
                    ring: "hsl(var(--sidebar-ring))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0", opacity: "0" },
                    to: {
                        height: "var(--radix-accordion-content-height)",
                        opacity: "1",
                    },
                },
                "accordion-up": {
                    from: {
                        height: "var(--radix-accordion-content-height)",
                        opacity: "1",
                    },
                    to: { height: "0", opacity: "0" },
                },
                "fade-in": {
                    from: { opacity: "0", transform: "translateY(20px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-20px)" },
                },
                glow: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.6" },
                },
                "slide-up": {
                    from: { opacity: "0", transform: "translateY(30px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                "scale-in": {
                    from: { opacity: "0", transform: "scale(0.95)" },
                    to: { opacity: "1", transform: "scale(1)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.3s ease-out",
                "accordion-up": "accordion-up 0.3s ease-out",
                "fade-in": "fade-in 0.6s ease-out",
                float: "float 6s ease-in-out infinite",
                glow: "glow 3s ease-in-out infinite",
                "slide-up": "slide-up 0.6s ease-out",
                "scale-in": "scale-in 0.4s ease-out",
            },
            fontFamily: {
                sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
                display: ["var(--font-poppins)", "Poppins", "Inter", "sans-serif"],
            },
            minHeight: {
                touch: "44px",
                "touch-lg": "48px",
            },
            minWidth: {
                touch: "44px",
                "touch-lg": "48px",
            },
        },
    },
    plugins: [
        require("tailwindcss-animate"),
        // Custom plugin for touch-specific utilities
        function ({ addUtilities }: { addUtilities: Function }) {
            const newUtilities = {
                ".touch-manipulation": {
                    "touch-action": "manipulation",
                },
                ".tap-highlight-none": {
                    "-webkit-tap-highlight-color": "transparent",
                },
                ".tap-highlight-primary": {
                    "-webkit-tap-highlight-color": "hsl(var(--primary) / 0.2)",
                },
                ".safe-area-inset-bottom": {
                    "padding-bottom": "env(safe-area-inset-bottom)",
                },
                ".safe-area-inset-top": {
                    "padding-top": "env(safe-area-inset-top)",
                },
                ".scroll-smooth-momentum": {
                    "-webkit-overflow-scrolling": "touch",
                },
            };
            addUtilities(newUtilities);
        },
    ],
};

export default config;
