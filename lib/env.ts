/**
 * Environment Variables Configuration
 * Validates and exports environment variables with type safety
 */

import { z } from "zod";

// Environment schema - all variables optional for flexibility
const envSchema = z.object({
    // ===========================================
    // Node Environment
    // ===========================================
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // ===========================================
    // App URLs
    // ===========================================
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

    // ===========================================
    // Supabase Configuration
    // ===========================================
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    SUPABASE_PROJECT_ID: z.string().optional(),

    // ===========================================
    // OpenAI Configuration
    // ===========================================
    OPENAI_API_KEY: z.string().optional(),

    // ===========================================
    // VAPI Configuration
    // ===========================================
    VAPI_API_KEY: z.string().optional(),
    VAPI_PHONE_NUMBER_ID: z.string().optional(),
    VAPI_WEBHOOK_SECRET: z.string().optional(),
    NEXT_PUBLIC_VAPI_PUBLIC_KEY: z.string().optional(),
    NEXT_PUBLIC_VAPI_ASSISTANT_ID: z.string().optional(),

    // ===========================================
    // Gamma API Configuration
    // ===========================================
    GAMMA_API_KEY: z.string().optional(),

    // ===========================================
    // Cloudflare Stream Configuration
    // ===========================================
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    CLOUDFLARE_STREAM_API_TOKEN: z.string().optional(),

    // ===========================================
    // Stripe Configuration
    // ===========================================
    STRIPE_SECRET_KEY: z.string().optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_CONNECT_CLIENT_ID: z.string().optional(),
    STRIPE_PLATFORM_FEE_PERCENT: z.coerce.number().default(20),
    STRIPE_PLATFORM_FEE_FIXED: z.coerce.number().default(50),

    // ===========================================
    // Optional: Observability & Monitoring
    // ===========================================
    SENTRY_DSN: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    LOGFIRE_TOKEN: z.string().optional(),
});

// Parse and validate environment variables
const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.issues
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join("\n");
            throw new Error(`❌ Invalid environment variables:\n${missingVars}`);
        }
        throw error;
    }
};

export const env = parseEnv();
