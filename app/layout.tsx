import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { validateEnv } from "@/lib/env";

// Fail fast if environment variables are misconfigured
// This runs at app startup (after Next.js has initialized process.env)
if (process.env.NODE_ENV !== "test") {
    validateEnv();
}

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

const poppins = Poppins({
    weight: ["400", "600", "700"],
    subsets: ["latin"],
    variable: "--font-poppins",
    display: "swap",
});

export const metadata: Metadata = {
    title: "GrowthMastery.ai - AI-Powered Funnel Builder",
    description:
        "The world's first done-for-you go-to-market engine that designs, builds, and deploys your entire funnel in hours. Automate sales, scale intelligently with AI.",
    openGraph: {
        title: "GrowthMastery.ai - AI-Powered Funnel Builder",
        description:
            "The world's first done-for-you go-to-market engine that designs, builds, and deploys your entire funnel in hours. Automate sales, scale intelligently with AI.",
        images: [
            {
                url: "/icon.png",
                width: 512,
                height: 512,
                alt: "GrowthMastery.ai Logo",
            },
        ],
        type: "website",
    },
    twitter: {
        card: "summary",
        title: "GrowthMastery.ai - AI-Powered Funnel Builder",
        description:
            "The world's first done-for-you go-to-market engine that designs, builds, and deploys your entire funnel in hours. Automate sales, scale intelligently with AI.",
        images: ["/icon.png"],
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="scroll-smooth">
            <body className={`${inter.variable} ${poppins.variable} font-sans`}>
                {children}
                <Toaster />
                {/* <AdvancedAIAssistant /> */}
            </body>
        </html>
    );
}
