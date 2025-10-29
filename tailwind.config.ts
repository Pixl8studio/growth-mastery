import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: "#EBF2FF",
                    100: "#D6E4FF",
                    200: "#ADC9FF",
                    300: "#85ADFF",
                    400: "#5C92FF",
                    500: "#4A7FFF", // Primary brand blue
                    600: "#3B66CC",
                    700: "#2C4C99",
                    800: "#1E3366",
                    900: "#0F1933",
                },
            },
        },
    },
    plugins: [],
};

export default config;
