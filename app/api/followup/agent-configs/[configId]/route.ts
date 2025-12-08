/**
 * Agent Config by ID API Endpoint
 *
 * Manages individual agent configuration operations.
 * Supports GET (retrieve), PUT (update), and DELETE operations.
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError, NotFoundError } from "@/lib/errors";
import {
    getAgentConfig,
    updateAgentConfig,
    deleteAgentConfig,
} from "@/lib/followup/agent-config-service";

type RouteContext = {
    params: Promise<{ configId: string }>;
};

/**
 * GET /api/followup/agent-configs/[configId]
 *
 * Retrieve a specific agent configuration.
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

        const { configId } = await context.params;

        if (!configId) {
            throw new ValidationError("configId is required");
        }

        // Get the agent config
        const result = await getAgentConfig(configId);

        if (!result.success) {
            throw new NotFoundError("Agent config");
        }

        // Verify ownership
        if (result.config?.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this agent config");
        }

        return NextResponse.json({
            success: true,
            config: result.config,
        });
    } catch (error) {
        logger.error(
            { error },
            "❌ Error in GET /api/followup/agent-configs/[configId]"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "get_agent_config",
                endpoint: "GET /api/followup/agent-configs/[configId]",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * PUT /api/followup/agent-configs/[configId]
 *
 * Update an agent configuration.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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

        const { configId } = await context.params;

        if (!configId) {
            throw new ValidationError("configId is required");
        }

        // Verify ownership before updating
        const { data: existingConfig } = await supabase
            .from("followup_agent_configs")
            .select("user_id")
            .eq("id", configId)
            .single();

        if (!existingConfig) {
            throw new NotFoundError("Agent config");
        }

        if (existingConfig.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this agent config");
        }

        const body = await request.json();

        // Remove fields that shouldn't be updated
        const {
            id: _id,
            user_id: _user_id,
            created_at: _created_at,
            ...updates
        } = body;

        logger.info(
            {
                configId,
                userId: user.id,
                updateFields: Object.keys(updates),
            },
            "🔄 Updating agent config"
        );

        // Update the agent config
        const result = await updateAgentConfig(configId, updates);

        if (!result.success) {
            logger.error(
                { error: result.error, configId },
                "❌ Agent config update failed"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info({ configId, userId: user.id }, "✅ Agent config updated via API");

        return NextResponse.json({
            success: true,
            config: result.config,
        });
    } catch (error) {
        logger.error(
            { error },
            "❌ Error in PUT /api/followup/agent-configs/[configId]"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "update_agent_config",
                endpoint: "PUT /api/followup/agent-configs/[configId]",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/followup/agent-configs/[configId]
 *
 * Delete an agent configuration.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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

        const { configId } = await context.params;

        if (!configId) {
            throw new ValidationError("configId is required");
        }

        // Verify ownership before deleting
        const { data: existingConfig } = await supabase
            .from("followup_agent_configs")
            .select("user_id")
            .eq("id", configId)
            .single();

        if (!existingConfig) {
            throw new NotFoundError("Agent config");
        }

        if (existingConfig.user_id !== user.id) {
            throw new AuthenticationError("Access denied to this agent config");
        }

        logger.info({ configId, userId: user.id }, "🗑️  Deleting agent config");

        // Delete the agent config
        const result = await deleteAgentConfig(configId);

        if (!result.success) {
            logger.error(
                { error: result.error, configId },
                "❌ Agent config deletion failed"
            );
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        logger.info({ configId, userId: user.id }, "✅ Agent config deleted via API");

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        logger.error(
            { error },
            "❌ Error in DELETE /api/followup/agent-configs/[configId]"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "delete_agent_config",
                endpoint: "DELETE /api/followup/agent-configs/[configId]",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
