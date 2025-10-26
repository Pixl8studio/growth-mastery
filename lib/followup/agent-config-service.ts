/**
 * Agent Config Service
 *
 * Manages AI agent configurations for follow-up automation.
 * Supports multiple configs per funnel (one per offer) with different
 * voice settings, knowledge base, and personalization rules.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { FollowupAgentConfig } from "@/types/followup";

export interface CreateAgentConfigInput {
    funnel_project_id: string;
    offer_id?: string;
    name: string;
    description?: string;
    voice_config?: Record<string, unknown>;
    knowledge_base?: Record<string, unknown>;
    outcome_goals?: Record<string, unknown>;
    segmentation_rules?: Record<string, unknown>;
    objection_handling?: Record<string, unknown>;
    scoring_config?: Record<string, unknown>;
    channel_config?: Record<string, unknown>;
    compliance_config?: Record<string, unknown>;
}

/**
 * Create a new agent configuration.
 *
 * Links to funnel project and optionally to a specific offer.
 * Each offer can have its own AI personality and messaging strategy.
 */
export async function createAgentConfig(
    userId: string,
    configData: CreateAgentConfigInput
): Promise<{ success: boolean; config?: FollowupAgentConfig; error?: string }> {
    const supabase = await createClient();

    logger.info(
        {
            userId,
            funnelProjectId: configData.funnel_project_id,
            offerId: configData.offer_id,
            name: configData.name,
        },
        "🤖 Creating agent configuration"
    );

    const { data, error } = await supabase
        .from("followup_agent_configs")
        .insert({
            user_id: userId,
            funnel_project_id: configData.funnel_project_id,
            offer_id: configData.offer_id || null,
            name: configData.name,
            description: configData.description || null,
            voice_config: configData.voice_config || undefined,
            knowledge_base: configData.knowledge_base || undefined,
            outcome_goals: configData.outcome_goals || undefined,
            segmentation_rules: configData.segmentation_rules || undefined,
            objection_handling: configData.objection_handling || undefined,
            scoring_config: configData.scoring_config || undefined,
            channel_config: configData.channel_config || undefined,
            compliance_config: configData.compliance_config || undefined,
        })
        .select()
        .single();

    if (error) {
        logger.error({ error, userId }, "❌ Failed to create agent config");
        return { success: false, error: error.message };
    }

    logger.info(
        { configId: data.id, name: data.name },
        "✅ Agent config created successfully"
    );

    return { success: true, config: data as FollowupAgentConfig };
}

/**
 * Get agent config by ID.
 */
export async function getAgentConfig(
    configId: string
): Promise<{ success: boolean; config?: FollowupAgentConfig; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("followup_agent_configs")
        .select("*")
        .eq("id", configId)
        .single();

    if (error) {
        logger.error({ error, configId }, "❌ Failed to fetch agent config");
        return { success: false, error: error.message };
    }

    return { success: true, config: data as FollowupAgentConfig };
}

/**
 * Get agent config for a specific offer.
 *
 * Each offer can have its own AI configuration with different voice,
 * knowledge base, and messaging strategy.
 */
export async function getAgentConfigForOffer(
    offerId: string
): Promise<{ success: boolean; config?: FollowupAgentConfig; error?: string }> {
    const supabase = await createClient();

    logger.info({ offerId }, "🔍 Finding agent config for offer");

    const { data, error } = await supabase
        .from("followup_agent_configs")
        .select("*")
        .eq("offer_id", offerId)
        .eq("is_active", true)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            // Not found - return default config for funnel
            logger.info(
                { offerId },
                "⚠️  No offer-specific config, will use funnel default"
            );
            return { success: true };
        }
        logger.error({ error, offerId }, "❌ Failed to fetch offer config");
        return { success: false, error: error.message };
    }

    logger.info({ offerId, configId: data.id }, "✅ Found offer-specific agent config");

    return { success: true, config: data as FollowupAgentConfig };
}

/**
 * Get default agent config for a funnel (no specific offer).
 */
export async function getDefaultAgentConfig(
    funnelProjectId: string
): Promise<{ success: boolean; config?: FollowupAgentConfig; error?: string }> {
    const supabase = await createClient();

    logger.info({ funnelProjectId }, "🔍 Finding default agent config for funnel");

    const { data, error } = await supabase
        .from("followup_agent_configs")
        .select("*")
        .eq("funnel_project_id", funnelProjectId)
        .is("offer_id", null)
        .eq("is_active", true)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            logger.warn({ funnelProjectId }, "⚠️  No default agent config found");
            return { success: true };
        }
        logger.error({ error, funnelProjectId }, "❌ Failed to fetch default config");
        return { success: false, error: error.message };
    }

    logger.info(
        { funnelProjectId, configId: data.id },
        "✅ Found default agent config"
    );

    return { success: true, config: data as FollowupAgentConfig };
}

/**
 * List agent configs for a funnel project.
 */
export async function listAgentConfigs(
    funnelProjectId: string
): Promise<{ success: boolean; configs?: FollowupAgentConfig[]; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("followup_agent_configs")
        .select("*")
        .eq("funnel_project_id", funnelProjectId)
        .order("created_at", { ascending: false });

    if (error) {
        logger.error({ error, funnelProjectId }, "❌ Failed to list agent configs");
        return { success: false, error: error.message };
    }

    return { success: true, configs: data as FollowupAgentConfig[] };
}

/**
 * Update agent configuration.
 */
export async function updateAgentConfig(
    configId: string,
    updates: Partial<FollowupAgentConfig>
): Promise<{ success: boolean; config?: FollowupAgentConfig; error?: string }> {
    const supabase = await createClient();

    logger.info(
        { configId, updates: Object.keys(updates) },
        "📝 Updating agent config"
    );

    const { data, error } = await supabase
        .from("followup_agent_configs")
        .update(updates)
        .eq("id", configId)
        .select()
        .single();

    if (error) {
        logger.error({ error, configId }, "❌ Failed to update agent config");
        return { success: false, error: error.message };
    }

    logger.info({ configId }, "✅ Agent config updated successfully");

    return { success: true, config: data as FollowupAgentConfig };
}

/**
 * Delete an agent configuration.
 */
export async function deleteAgentConfig(
    configId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    logger.info({ configId }, "🗑️  Deleting agent config");

    const { error } = await supabase
        .from("followup_agent_configs")
        .delete()
        .eq("id", configId);

    if (error) {
        logger.error({ error, configId }, "❌ Failed to delete agent config");
        return { success: false, error: error.message };
    }

    logger.info({ configId }, "✅ Agent config deleted successfully");

    return { success: true };
}

/**
 * Activate an agent configuration.
 *
 * Deactivates other configs for the same offer to ensure only one active config per offer.
 */
export async function activateAgentConfig(
    configId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    logger.info({ configId }, "🔄 Activating agent config");

    // Get the config to find its offer_id
    const { data: config, error: fetchError } = await supabase
        .from("followup_agent_configs")
        .select("offer_id, funnel_project_id")
        .eq("id", configId)
        .single();

    if (fetchError || !config) {
        logger.error({ error: fetchError, configId }, "❌ Failed to fetch config");
        return { success: false, error: "Config not found" };
    }

    // Deactivate other configs for the same offer
    if (config.offer_id) {
        await supabase
            .from("followup_agent_configs")
            .update({ is_active: false })
            .eq("offer_id", config.offer_id)
            .neq("id", configId);
    } else {
        // Deactivate other default configs for the funnel
        await supabase
            .from("followup_agent_configs")
            .update({ is_active: false })
            .eq("funnel_project_id", config.funnel_project_id)
            .is("offer_id", null)
            .neq("id", configId);
    }

    // Activate this config
    const { error: updateError } = await supabase
        .from("followup_agent_configs")
        .update({ is_active: true })
        .eq("id", configId);

    if (updateError) {
        logger.error({ error: updateError, configId }, "❌ Failed to activate config");
        return { success: false, error: updateError.message };
    }

    logger.info({ configId }, "✅ Agent config activated");

    return { success: true };
}

/**
 * Get appropriate agent config for a prospect.
 *
 * Returns offer-specific config if prospect is associated with an offer,
 * otherwise returns default funnel config.
 */
export async function getAgentConfigForProspect(
    prospectId: string
): Promise<{ success: boolean; config?: FollowupAgentConfig; error?: string }> {
    const supabase = await createClient();

    // Get prospect with agent_config_id
    const { data: prospect, error: prospectError } = await supabase
        .from("followup_prospects")
        .select("agent_config_id, funnel_project_id")
        .eq("id", prospectId)
        .single();

    if (prospectError || !prospect) {
        logger.error(
            { error: prospectError, prospectId },
            "❌ Failed to fetch prospect"
        );
        return { success: false, error: "Prospect not found" };
    }

    // If prospect has specific agent config, use it
    if (prospect.agent_config_id) {
        return getAgentConfig(prospect.agent_config_id);
    }

    // Otherwise, get default config for funnel
    return getDefaultAgentConfig(prospect.funnel_project_id);
}
