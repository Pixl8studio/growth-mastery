/**
 * Segmentation Service
 *
 * Utilities for determining prospect segments based on watch percentage
 * and applying segment-specific configuration rules.
 */

import type { FollowupSegment } from "@/types/followup";

export interface SegmentConfig {
    name: string;
    watchPctRange: [number, number];
    touchCount: number;
    cadenceHours: number[];
    tone: string;
    primaryCTA: string;
    description: string;
}

/**
 * Segment configurations from config.md specification
 */
const SEGMENT_CONFIGS: Record<FollowupSegment, SegmentConfig> = {
    no_show: {
        name: "No-Show Lite",
        watchPctRange: [0, 0],
        touchCount: 2,
        cadenceHours: [0, 72],
        tone: "gentle_reminder",
        primaryCTA: "watch_replay",
        description: "Registered but didn't attend - gentle re-engagement",
    },
    skimmer: {
        name: "Skimmer",
        watchPctRange: [1, 24],
        touchCount: 3,
        cadenceHours: [0, 24, 72],
        tone: "curiosity_building",
        primaryCTA: "key_moments",
        description: "Watched briefly - show them what they missed",
    },
    sampler: {
        name: "Sampler",
        watchPctRange: [25, 49],
        touchCount: 4,
        cadenceHours: [0, 6, 24, 96],
        tone: "value_reinforcement",
        primaryCTA: "complete_watch",
        description: "Watched some - encourage completion",
    },
    engaged: {
        name: "Engaged",
        watchPctRange: [50, 74],
        touchCount: 5,
        cadenceHours: [0, 3, 24, 48, 72],
        tone: "conversion_focused",
        primaryCTA: "book_call",
        description: "Watched most - move to conversion",
    },
    hot: {
        name: "Hot",
        watchPctRange: [75, 100],
        touchCount: 5,
        cadenceHours: [0, 1, 24, 48, 72],
        tone: "urgency_driven",
        primaryCTA: "claim_offer",
        description: "Watched nearly all - strong conversion focus",
    },
};

/**
 * Determine prospect segment based on watch percentage.
 *
 * Implements the 5-segment ladder from config.md:
 * - No-Show: 0%
 * - Skimmer: 1-24%
 * - Sampler: 25-49%
 * - Engaged: 50-74%
 * - Hot: 75-100%
 */
export function determineSegment(watchPct: number): FollowupSegment {
    if (watchPct === 0) return "no_show";
    if (watchPct <= 24) return "skimmer";
    if (watchPct <= 49) return "sampler";
    if (watchPct <= 74) return "engaged";
    return "hot";
}

/**
 * Get configuration for a specific segment.
 */
export function getSegmentConfig(segment: FollowupSegment): SegmentConfig {
    return SEGMENT_CONFIGS[segment];
}

/**
 * Calculate number of touches for a segment.
 */
export function calculateTouchCounts(segment: FollowupSegment): number {
    return SEGMENT_CONFIGS[segment].touchCount;
}

/**
 * Get all segment configurations.
 */
export function getAllSegmentConfigs(): Record<FollowupSegment, SegmentConfig> {
    return SEGMENT_CONFIGS;
}

/**
 * Calculate intent score based on watch percentage and engagement signals.
 *
 * Formula from config.md:
 * intent_score = 0.45 × (watch_pct/100)
 *              + 0.25 × offer_click
 *              + 0.15 × min(1, questions_count/2)
 *              + 0.10 × replay_views
 *              + 0.05 × email_clicked
 */
export function calculateIntentScore(signals: {
    watchPct: number;
    offerClick: boolean;
    questionsCount: number;
    replayViews: number;
    emailClicked: boolean;
}): number {
    const score =
        0.45 * (signals.watchPct / 100) +
        0.25 * (signals.offerClick ? 1 : 0) +
        0.15 * Math.min(1, signals.questionsCount / 2) +
        0.1 * Math.min(1, signals.replayViews) +
        0.05 * (signals.emailClicked ? 1 : 0);

    return Math.round(score * 100);
}

/**
 * Get engagement level based on intent score.
 *
 * - Hot: ≥ 60
 * - Warm: 30-59
 * - Cold: < 30
 */
export function getEngagementLevel(intentScore: number): "hot" | "warm" | "cold" {
    if (intentScore >= 60) return "hot";
    if (intentScore >= 30) return "warm";
    return "cold";
}
