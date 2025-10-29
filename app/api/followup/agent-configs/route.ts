/**
 * Agent Configs API Endpoint
 *
 * Manages AI agent configurations for follow-up automation.
 * Supports POST (create) and GET (list) operations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import {
    createAgentConfig,
    listAgentConfigs,
} from "@/lib/followup/agent-config-service";
import type { CreateAgentConfigInput } from "@/lib/followup/agent-config-service";

/**
 * POST /api/followup/agent-configs
 *
 * Create a new agent configuration.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const body = await request.json();

        // Validate required fields
        if (!body.funnel_project_id) {
            throw new ValidationError("funnel_project_id is required");
        }

        if (!body.name) {
            throw new ValidationError("name is required");
        }

        // Verify ownership of funnel project
        const { data: project } = await supabase
            .from("funnel_projects")
            .select("user_id")
            .eq("id", body.funnel_project_id)
            .single();

        if (!project || project.user_id !== user.id) {
            throw new AuthenticationError("Access denied to funnel project");
        }

        // Create agent config input
        const configInput: CreateAgentConfigInput = {
            funnel_project_id: body.funnel_project_id,
            offer_id: body.offer_id,
            name: body.name,
            description: body.description,
            voice_config: body.voice_config,
            knowledge_base: body.knowledge_base,
            outcome_goals: body.outcome_goals,
            segmentation_rules: body.segmentation_rules,
            objection_handling: body.objection_handling,
            scoring_config: body.scoring_config,
            scoring_rules: body.scoring_rules,
            channel_config: body.channel_config,
            compliance_config: body.compliance_config,
            sender_name: body.sender_name,
            sender_email: body.sender_email,
            sms_sender_id: body.sms_sender_id,
        };

        // Create the agent config
        const result = await createAgentConfig(user.id, configInput);

        if (!result.success) {
            logger.error(
                { error: result.error, userId: user.id },
                "❌ Agent config creation failed"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info(
            {
                configId: result.config?.id,
                userId: user.id,
                name: body.name,
            },
            "✅ Agent config created via API"
        );

        return NextResponse.json({
            success: true,
            config: result.config,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in POST /api/followup/agent-configs");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * GET /api/followup/agent-configs
 *
 * List agent configs for a funnel project.
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const funnelProjectId = searchParams.get("funnel_project_id");

        if (!funnelProjectId) {
            throw new ValidationError("funnel_project_id query parameter is required");
        }

        // Verify ownership
        const { data: project } = await supabase
            .from("funnel_projects")
            .select("user_id")
            .eq("id", funnelProjectId)
            .single();

        if (!project || project.user_id !== user.id) {
            throw new AuthenticationError("Access denied to funnel project");
        }

        // List agent configs
        const result = await listAgentConfigs(funnelProjectId);

        if (!result.success) {
            logger.error(
                { error: result.error, userId: user.id },
                "❌ Failed to list agent configs"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            configs: result.configs || [],
            count: result.configs?.length || 0,
        });
    } catch (error) {
        logger.error({ error }, "❌ Error in GET /api/followup/agent-configs");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
