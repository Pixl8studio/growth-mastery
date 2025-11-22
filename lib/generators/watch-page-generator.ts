/**
 * Watch Page HTML Generator
 * Generates editor-ready HTML with video player and engagement blocks
 */

import type { Slide } from "@/lib/ai/types";
import { getIconSvg } from "@/lib/utils/icon-mapper";

interface Theme {
    primary: string;
    secondary: string;
    background: string;
    text: string;
}

interface DeckStructureData {
    id: string;
    slides: Slide[];
    metadata?: {
        title?: string;
        [key: string]: unknown;
    };
    total_slides?: number;
}

interface WatchPageGeneratorOptions {
    projectId: string;
    deckStructure: DeckStructureData;
    videoUrl: string;
    headline?: string;
    theme: Theme;
}

/**
 * Extract key takeaways from deck structure
 * Focuses on solution and offer sections for main points
 */
function extractTakeawaysFromDeck(slides: Slide[]): Array<{
    icon: string;
    title: string;
    description: string;
}> {
    const solutionSlides = slides.filter(
        (s) => s.section === "solution" || s.section === "offer"
    );

    if (solutionSlides.length === 0) {
        return [
            {
                icon: "target",
                title: "Strategy #1",
                description:
                    "The exact framework to identify and eliminate bottlenecks in your current business processes.",
            },
            {
                icon: "zap",
                title: "Strategy #2",
                description:
                    "How to automate your most time-consuming tasks using AI and proven systems.",
            },
            {
                icon: "rocket",
                title: "Strategy #3",
                description:
                    "The scaling blueprint that generates consistent results without burning you out.",
            },
        ];
    }

    return solutionSlides.slice(0, 6).map((slide, idx) => ({
        icon: ["target", "zap", "rocket", "lightbulb", "star", "star"][idx] || "star",
        title: slide.title || `Strategy #${idx + 1}`,
        description: slide.description || slide.title || "Key strategy revealed",
    }));
}

/**
 * Process video URL to add autoplay for YouTube videos
 */
function processVideoUrl(videoUrl: string): string {
    let processedUrl = videoUrl;

    // Convert YouTube watch URLs to embed format with autoplay
    processedUrl = processedUrl.replace(
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g,
        "https://www.youtube.com/embed/$1?autoplay=1&mute=1&rel=0&modestbranding=1"
    );

    // Convert short YouTube URLs
    processedUrl = processedUrl.replace(
        /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]+)/g,
        "https://www.youtube.com/embed/$1?autoplay=1&mute=1&rel=0&modestbranding=1"
    );

    // Handle existing embed URLs to ensure autoplay
    processedUrl = processedUrl.replace(
        /https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]+)(?:\?([^"]*?))?/g,
        (match: string, videoId: string, existingParams: string) => {
            const params = ["autoplay=1", "mute=1", "rel=0", "modestbranding=1"];

            if (existingParams) {
                const existingParamsArray = existingParams.split("&");
                const filteredParams = existingParamsArray.filter(
                    (param: string) =>
                        !param.startsWith("autoplay=") && !param.startsWith("mute=")
                );
                params.push(...filteredParams);
            }

            return `https://www.youtube.com/embed/${videoId}?${params.join("&")}`;
        }
    );

    return processedUrl;
}

/**
 * Generate complete watch page HTML with editor-ready blocks
 */
export function generateWatchPageHTML(options: WatchPageGeneratorOptions): string {
    const { deckStructure, videoUrl, headline, theme } = options;

    const takeaways = extractTakeawaysFromDeck(deckStructure.slides);
    const processedVideoUrl = processVideoUrl(videoUrl);

    const finalHeadline =
        headline || deckStructure.metadata?.title || "Watch This Exclusive Training";

    return `
<div class="page-container">
    <!-- Protected Video Hero Section - Cannot be deleted -->
    <div class="block hero-block bg-hero" data-block-type="video-hero" data-protected="true" style="background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%); padding: var(--space-12) 0;">
        <div class="container">
            <div class="hero-content" style="text-align: center; margin-bottom: var(--space-8);">
                <h1 class="hero-title" data-editable="true" style="color: white; font-size: 2.5rem; font-weight: 800; margin-bottom: var(--space-4);">
                    ${finalHeadline}
                </h1>
                <p class="subheading" data-editable="true" style="color: white; font-size: 1.2rem; margin-bottom: var(--space-8); opacity: 0.95;">
                    Watch this exclusive training to transform your business
                </p>
            </div>

            <!-- Video Player Section - Core Element -->
            <div class="video-container" data-element-type="video-player" data-protected="true" style="max-width: 900px; margin: 0 auto; background: #000; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                <iframe src="${processedVideoUrl}" width="100%" height="500" frameborder="0" allowfullscreen allow="autoplay; encrypted-media" style="display: block;" data-video-source="${processedVideoUrl}"></iframe>

                <!-- Video Progress Bar -->
                <div class="video-progress" style="height: 4px; background: #374151;">
                    <div class="progress-bar" style="height: 100%; width: 0%; background: ${theme.secondary}; transition: width 0.3s ease;"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Watch Progress Section -->
    <div class="block bg-section-1" data-block-type="progress" style="padding: var(--space-16) 0; background: white;">
        <div class="container">
            <div style="text-align: center; max-width: 600px; margin: 0 auto;">
                <h2 class="heading-2" data-editable="true" style="margin-bottom: var(--space-8); font-size: 2rem; font-weight: 700;">
                    You're Making <strong style="color: ${theme.primary};">Great Progress</strong>
                </h2>
                <div class="progress-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-6); margin-bottom: var(--space-8);">
                    <div class="stat-item" style="text-align: center;">
                        <div class="stat-number" data-editable="true" style="font-size: 2rem; font-weight: 800; color: ${theme.primary}; margin-bottom: var(--space-2);">67%</div>
                        <div class="stat-label" data-editable="true" style="color: #6b7280; font-size: 0.9rem;">Training Complete</div>
                    </div>
                    <div class="stat-item" style="text-align: center;">
                        <div class="stat-number" data-editable="true" style="font-size: 2rem; font-weight: 800; color: ${theme.primary}; margin-bottom: var(--space-2);">23min</div>
                        <div class="stat-label" data-editable="true" style="color: #6b7280; font-size: 0.9rem;">Time Remaining</div>
                    </div>
                    <div class="stat-item" style="text-align: center;">
                        <div class="stat-number" data-editable="true" style="font-size: 2rem; font-weight: 800; color: ${theme.primary}; margin-bottom: var(--space-2);">5,234</div>
                        <div class="stat-label" data-editable="true" style="color: #6b7280; font-size: 0.9rem;">Watching Live</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Key Takeaways Section -->
    <div class="block bg-section-2" data-block-type="takeaways" style="padding: var(--space-20) 0; background: #f9fafb;">
        <div class="container">
            <div class="heading-block" style="text-align: center; margin-bottom: var(--space-12);">
                <h2 class="heading-2" data-editable="true" style="font-size: 2.5rem; font-weight: 800; color: #1f2937;">
                    Key <strong style="color: ${theme.primary};">Takeaways</strong>
                </h2>
            </div>
            <div class="features-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-8); max-width: 1200px; margin: 0 auto;">
                ${takeaways
                    .map(
                        (takeaway) => `
                    <div class="feature-card" style="text-align: center; padding: var(--space-6); background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                        <div class="feature-icon" style="width: 48px; height: 48px; margin: 0 auto var(--space-4); color: hsl(103 89% 29%);">${getIconSvg(takeaway.icon)}</div>
                        <h3 class="feature-title" data-editable="true" style="margin-bottom: var(--space-4); font-size: 1.3rem; font-weight: 700; color: #1f2937;">${takeaway.title}</h3>
                        <p class="feature-description" data-editable="true" style="color: #6b7280; line-height: 1.6;">${takeaway.description}</p>
                    </div>
                `
                    )
                    .join("")}
            </div>
        </div>
    </div>

    <!-- Call to Action Section -->
    <div class="block bg-cta" data-block-type="cta" style="background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%); padding: var(--space-20) 0; text-align: center;">
        <div class="container">
            <h2 class="heading-2" data-editable="true" style="color: white; margin-bottom: var(--space-6); font-size: 2.5rem; font-weight: 800;">
                Ready to <strong>Transform Your Business?</strong>
            </h2>
            <p style="color: white; font-size: 1.2rem; margin-bottom: var(--space-8); opacity: 0.95;" data-editable="true">
                Don't let this opportunity slip away. Take action now and secure your spot.
            </p>
            <a href="#enroll" class="btn btn-secondary btn-large" data-editable="true"
               style="background: white; color: ${theme.primary}; padding: 1.2rem 2rem; font-size: 1.1rem; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                GET INSTANT ACCESS NOW
            </a>
            <p style="color: white; margin-top: var(--space-4); font-size: 0.9rem; opacity: 0.9;" data-editable="true">
                ⏰ Limited time offer expires in 24 hours
            </p>
        </div>
    </div>

    <!-- Live Chat Section -->
    <div class="block bg-section-1" data-block-type="chat" style="padding: var(--space-16) 0; background: white;">
        <div class="container">
            <div style="max-width: 600px; margin: 0 auto; text-align: center;">
                <h3 data-editable="true" style="margin-bottom: var(--space-6); font-size: 1.5rem; font-weight: 700; color: #1f2937;">Join the Live Discussion</h3>
                <div class="chat-placeholder" style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: var(--space-8); min-height: 200px;">
                    <p data-editable="true" style="color: #6b7280; margin-bottom: var(--space-4);">
                        Chat with other attendees and ask your questions live!
                    </p>
                    <div style="display: flex; gap: var(--space-2);">
                        <input type="text" placeholder="Type your message..."
                               style="flex: 1; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;">
                        <button style="background: ${theme.primary}; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
    `.trim();
}
