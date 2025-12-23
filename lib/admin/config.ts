/**
 * Admin Configuration
 * Centralized configuration fetching from admin_settings table
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// Default values used when settings cannot be fetched
// These match the values inserted in the migration
const DEFAULT_SETTINGS = {
    costAlertThresholdCents: 5000,
    healthScoreWeights: {
        engagement: 25,
        success: 30,
        technical: 25,
        billing: 20,
    },
    errorSpikeThreshold: 5,
    npsSurveyIntervalDays: 90,
} as const;

export interface HealthScoreWeights {
    engagement: number;
    success: number;
    technical: number;
    billing: number;
}

export interface AdminConfig {
    costAlertThresholdCents: number;
    healthScoreWeights: HealthScoreWeights;
    errorSpikeThreshold: number;
    npsSurveyIntervalDays: number;
}

/**
 * Fetch admin settings from the database
 * Falls back to defaults if settings cannot be fetched
 */
export async function getAdminSettings(): Promise<AdminConfig> {
    const supabase = await createClient();

    const { data: settings, error } = await supabase
        .from("admin_settings")
        .select("setting_key, setting_value");

    if (error) {
        logger.warn({ error }, "Failed to fetch admin settings, using defaults");
        return { ...DEFAULT_SETTINGS };
    }

    const settingsMap = new Map(
        settings?.map((s) => [s.setting_key, s.setting_value]) || []
    );

    return {
        costAlertThresholdCents:
            (settingsMap.get("cost_alert_threshold_cents") as number) ??
            DEFAULT_SETTINGS.costAlertThresholdCents,
        healthScoreWeights:
            (settingsMap.get("health_score_weights") as HealthScoreWeights) ??
            DEFAULT_SETTINGS.healthScoreWeights,
        errorSpikeThreshold:
            (settingsMap.get("error_spike_threshold") as number) ??
            DEFAULT_SETTINGS.errorSpikeThreshold,
        npsSurveyIntervalDays:
            (settingsMap.get("nps_survey_interval_days") as number) ??
            DEFAULT_SETTINGS.npsSurveyIntervalDays,
    };
}

/**
 * Get a specific admin setting
 */
export async function getAdminSetting<K extends keyof AdminConfig>(
    key: K
): Promise<AdminConfig[K]> {
    const settings = await getAdminSettings();
    return settings[key];
}

/**
 * Estimate active users based on a percentage of total users
 *
 * METHODOLOGY NOTE:
 * This is an estimation until real activity tracking is implemented.
 * The 15% estimate is based on typical SaaS daily active user (DAU) rates:
 * - Enterprise SaaS: 10-20% DAU/MAU ratio
 * - Consumer SaaS: 5-15% DAU/MAU ratio
 * - Highly engaged products: 20-30%
 *
 * For a webinar funnel builder with sporadic usage patterns,
 * 15% is a conservative middle-ground estimate.
 *
 * TODO: Implement real activity tracking by:
 * 1. Adding an activity_logs table
 * 2. Tracking page views, API calls, or funnel edits
 * 3. Using last_active_at timestamp on user_profiles
 */
export const ESTIMATED_DAILY_ACTIVE_RATE = 0.15;

/**
 * Calculate estimated active users for today
 */
export function estimateActiveToday(totalUsers: number): number {
    return Math.round(totalUsers * ESTIMATED_DAILY_ACTIVE_RATE);
}
