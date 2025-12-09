/**
 * Marketing Experiments API
 * Create and manage A/B testing experiments
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();

        logger.info(
            { userId: user.id, experimentName: body.name },
            "Experiment creation requested"
        );

        // Mock experiment creation
        const mockExperiment = {
            id: `exp_${Date.now()}`,
            user_id: user.id,
            funnel_project_id: body.funnel_project_id,
            name: body.name,
            experiment_type: body.experiment_type,
            variant_a_id: body.variant_a_id,
            variant_b_id: null,
            status: "draft",
            config: body.config,
            created_at: new Date().toISOString(),
        };

        return NextResponse.json({
            success: true,
            experiment: mockExperiment,
        });
    } catch (error) {
        logger.error({ error }, "Experiment creation failed");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/marketing/experiments",
            },
        });

        return NextResponse.json(
            {
                success: false,
                error: "Failed to create experiment",
            },
            { status: 500 }
        );
    }
}
