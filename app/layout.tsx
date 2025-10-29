import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AdvancedAIAssistant } from "@/components/support/advanced-ai-assistant";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Genie AI - AI-Powered Funnel Builder",
    description:
        "Create high-converting pitch video funnels with AI in under 45 minutes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {children}
                <Toaster />
                <AdvancedAIAssistant />
            </body>
        </html>
    );
}
