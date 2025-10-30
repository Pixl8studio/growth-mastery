import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AdvancedAIAssistant } from "@/components/support/advanced-ai-assistant";

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
        "The world's first go-to-market engine that designs, builds, and deploys your entire funnel and marketing assets so you can automate sales in hours, not months.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${poppins.variable} font-sans`}>
                {children}
                <Toaster />
                <AdvancedAIAssistant />
            </body>
        </html>
    );
}
