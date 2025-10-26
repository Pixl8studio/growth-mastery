/**
 * Sequence Service
 *
 * Manages AI follow-up sequences and messages.
 * Handles CRUD operations for sequences and their associated messages.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { FollowupMessage, FollowupSequence } from "@/types/followup";

/**
 * Create a new follow-up sequence.
 */
export async function createSequence(
    agentConfigId: string,
    sequenceData: {
        name: string;
        description?: string;
        sequence_type?: string;
        trigger_event: string;
        trigger_delay_hours?: number;
        deadline_hours?: number;
        total_messages?: number;
        target_segments?: string[];
        requires_manual_approval?: boolean;
    }
): Promise<{ success: boolean; sequence?: FollowupSequence; error?: string }> {
    const supabase = await createClient();

    logger.info(
        {
            agentConfigId,
            name: sequenceData.name,
            triggerEvent: sequenceData.trigger_event,
        },
        "📨 Creating follow-up sequence"
    );

    const { data, error } = await supabase
        .from("followup_sequences")
        .insert({
            agent_config_id: agentConfigId,
            name: sequenceData.name,
            description: sequenceData.description || null,
            sequence_type: sequenceData.sequence_type || "3_day_discount",
            trigger_event: sequenceData.trigger_event,
            trigger_delay_hours: sequenceData.trigger_delay_hours || 0,
            deadline_hours: sequenceData.deadline_hours || 72,
            total_messages: sequenceData.total_messages || 5,
            target_segments: sequenceData.target_segments || [
                "no_show",
                "skimmer",
                "sampler",
                "engaged",
                "hot",
            ],
            requires_manual_approval: sequenceData.requires_manual_approval ?? true,
        })
        .select()
        .single();

    if (error) {
        logger.error({ error, agentConfigId }, "❌ Failed to create sequence");
        return { success: false, error: error.message };
    }

    logger.info(
        { sequenceId: data.id, name: data.name },
        "✅ Sequence created successfully"
    );

    return { success: true, sequence: data as FollowupSequence };
}

/**
 * Get sequence by ID.
 */
export async function getSequence(
    sequenceId: string
): Promise<{ success: boolean; sequence?: FollowupSequence; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("followup_sequences")
        .select("*")
        .eq("id", sequenceId)
        .single();

    if (error) {
        logger.error({ error, sequenceId }, "❌ Failed to fetch sequence");
        return { success: false, error: error.message };
    }

    return { success: true, sequence: data as FollowupSequence };
}

/**
 * List sequences for an agent config.
 */
export async function listSequences(
    agentConfigId: string
): Promise<{ success: boolean; sequences?: FollowupSequence[]; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("followup_sequences")
        .select("*")
        .eq("agent_config_id", agentConfigId)
        .order("created_at", { ascending: false });

    if (error) {
        logger.error({ error, agentConfigId }, "❌ Failed to list sequences");
        return { success: false, error: error.message };
    }

    return { success: true, sequences: data as FollowupSequence[] };
}

/**
 * Update sequence configuration.
 */
export async function updateSequence(
    sequenceId: string,
    updates: Partial<FollowupSequence>
): Promise<{ success: boolean; sequence?: FollowupSequence; error?: string }> {
    const supabase = await createClient();

    logger.info({ sequenceId, updates: Object.keys(updates) }, "📝 Updating sequence");

    const { data, error } = await supabase
        .from("followup_sequences")
        .update(updates)
        .eq("id", sequenceId)
        .select()
        .single();

    if (error) {
        logger.error({ error, sequenceId }, "❌ Failed to update sequence");
        return { success: false, error: error.message };
    }

    logger.info({ sequenceId }, "✅ Sequence updated successfully");

    return { success: true, sequence: data as FollowupSequence };
}

/**
 * Delete a sequence.
 */
export async function deleteSequence(
    sequenceId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    logger.info({ sequenceId }, "🗑️  Deleting sequence");

    const { error } = await supabase
        .from("followup_sequences")
        .delete()
        .eq("id", sequenceId);

    if (error) {
        logger.error({ error, sequenceId }, "❌ Failed to delete sequence");
        return { success: false, error: error.message };
    }

    logger.info({ sequenceId }, "✅ Sequence deleted successfully");

    return { success: true };
}

// ===========================================
// MESSAGE MANAGEMENT
// ===========================================

/**
 * Create a message in a sequence.
 */
export async function createMessage(
    sequenceId: string,
    messageData: {
        name: string;
        message_order: number;
        channel: "email" | "sms";
        send_delay_hours: number;
        subject_line?: string;
        body_content: string;
        primary_cta?: {
            text: string;
            url: string;
            tracking_enabled?: boolean;
        };
        ab_test_variant?: string | null;
    }
): Promise<{ success: boolean; message?: FollowupMessage; error?: string }> {
    const supabase = await createClient();

    logger.info(
        {
            sequenceId,
            name: messageData.name,
            order: messageData.message_order,
            channel: messageData.channel,
        },
        "✉️ Creating message"
    );

    const { data, error } = await supabase
        .from("followup_messages")
        .insert({
            sequence_id: sequenceId,
            name: messageData.name,
            message_order: messageData.message_order,
            channel: messageData.channel,
            send_delay_hours: messageData.send_delay_hours,
            subject_line: messageData.subject_line || null,
            body_content: messageData.body_content,
            primary_cta: messageData.primary_cta || {
                text: "Take action",
                url: "",
                tracking_enabled: true,
            },
            ab_test_variant: messageData.ab_test_variant || null,
        })
        .select()
        .single();

    if (error) {
        logger.error({ error, sequenceId }, "❌ Failed to create message");
        return { success: false, error: error.message };
    }

    logger.info(
        { messageId: data.id, sequenceId, order: data.message_order },
        "✅ Message created successfully"
    );

    return { success: true, message: data as FollowupMessage };
}

/**
 * Get message by ID.
 */
export async function getMessage(
    messageId: string
): Promise<{ success: boolean; message?: FollowupMessage; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("followup_messages")
        .select("*")
        .eq("id", messageId)
        .single();

    if (error) {
        logger.error({ error, messageId }, "❌ Failed to fetch message");
        return { success: false, error: error.message };
    }

    return { success: true, message: data as FollowupMessage };
}

/**
 * List messages for a sequence.
 */
export async function listMessages(
    sequenceId: string
): Promise<{ success: boolean; messages?: FollowupMessage[]; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("followup_messages")
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("message_order", { ascending: true });

    if (error) {
        logger.error({ error, sequenceId }, "❌ Failed to list messages");
        return { success: false, error: error.message };
    }

    return { success: true, messages: data as FollowupMessage[] };
}

/**
 * Update a message.
 */
export async function updateMessage(
    messageId: string,
    updates: Partial<FollowupMessage>
): Promise<{ success: boolean; message?: FollowupMessage; error?: string }> {
    const supabase = await createClient();

    logger.info({ messageId, updates: Object.keys(updates) }, "📝 Updating message");

    const { data, error } = await supabase
        .from("followup_messages")
        .update(updates)
        .eq("id", messageId)
        .select()
        .single();

    if (error) {
        logger.error({ error, messageId }, "❌ Failed to update message");
        return { success: false, error: error.message };
    }

    logger.info({ messageId }, "✅ Message updated successfully");

    return { success: true, message: data as FollowupMessage };
}

/**
 * Delete a message.
 */
export async function deleteMessage(
    messageId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    logger.info({ messageId }, "🗑️  Deleting message");

    const { error } = await supabase
        .from("followup_messages")
        .delete()
        .eq("id", messageId);

    if (error) {
        logger.error({ error, messageId }, "❌ Failed to delete message");
        return { success: false, error: error.message };
    }

    logger.info({ messageId }, "✅ Message deleted successfully");

    return { success: true };
}

/**
 * Get sequence performance metrics.
 */
export async function getSequencePerformance(sequenceId: string): Promise<{
    success: boolean;
    metrics?: Record<string, unknown>;
    error?: string;
}> {
    const supabase = await createClient();

    logger.info({ sequenceId }, "📊 Fetching sequence performance");

    const { data, error } = await supabase.rpc("get_sequence_performance", {
        p_sequence_id: sequenceId,
    });

    if (error) {
        logger.error({ error, sequenceId }, "❌ Failed to get sequence performance");
        return { success: false, error: error.message };
    }

    return { success: true, metrics: data };
}
