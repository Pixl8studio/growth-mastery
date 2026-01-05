/**
 * Environment Variables Configuration
 * Validates and exports environment variables with type safety
 *
 * ⚠️ IMPORTANT: This module uses lazy validation via Proxy.
 * - Validation runs on FIRST property access, NOT at import time
 * - To fail fast, call validateEnv() explicitly (see app/layout.tsx)
 *
 * ⚠️ DESTRUCTURING WARNING:
 * DO NOT destructure at module scope - it triggers validation at import time:
 *   ❌ const { NODE_ENV } = env;  // BAD - triggers validation immediately
 *   ✅ const nodeEnv = env.NODE_ENV;  // OK - access when needed
 *   ✅ function getNodeEnv() { return env.NODE_ENV; }  // OK - deferred access
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
    // Anthropic Configuration (Primary AI Provider)
    // ===========================================
    ANTHROPIC_API_KEY: z.string().optional(),

    // ===========================================
    // OpenAI Configuration (Image Generation Fallback)
    // ===========================================
    OPENAI_API_KEY: z.string().optional(),

    // ===========================================
    // Google Gemini Configuration (Primary Image Generation)
    // ===========================================
    GEMINI_API_KEY: z.string().optional(),

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
    // Social Media Integrations
    // ===========================================
    FACEBOOK_APP_ID: z.string().optional(),
    FACEBOOK_APP_SECRET: z.string().optional(),
    INSTAGRAM_CLIENT_ID: z.string().optional(),
    INSTAGRAM_CLIENT_SECRET: z.string().optional(),
    TWITTER_CLIENT_ID: z.string().optional(),
    TWITTER_CLIENT_SECRET: z.string().optional(),
    LINKEDIN_CLIENT_ID: z.string().optional(),
    LINKEDIN_CLIENT_SECRET: z.string().optional(),

    // ===========================================
    // Google OAuth (Gmail & Calendar)
    // ===========================================
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GMAIL_REDIRECT_URI: z.string().optional(),

    // ===========================================
    // Integration Encryption
    // ===========================================
    INTEGRATION_ENCRYPTION_KEY: z.string().optional(),

    // ===========================================
    // Email Services
    // ===========================================
    // Mailgun (Primary Email Provider)
    MAILGUN_API_KEY: z.string().optional(),
    MAILGUN_REGION: z.enum(["us", "eu"]).default("us"),
    MAILGUN_WEBHOOK_SIGNING_KEY: z.string().optional(),

    // SendGrid (Legacy Email Provider)
    SENDGRID_API_KEY: z.string().optional(),
    SENDGRID_VERIFIED_SENDER_EMAIL: z.string().optional(),

    // Twilio (SMS Provider)
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),

    // Follow-Up Configuration
    FOLLOWUP_FROM_EMAIL: z.string().optional(),
    FOLLOWUP_FROM_NAME: z.string().optional(),

    // ===========================================
    // Vercel Domains API
    // ===========================================
    VERCEL_TOKEN: z.string().optional(),
    VERCEL_PROJECT_ID: z.string().optional(),
    VERCEL_TEAM_ID: z.string().optional(),

    // ===========================================
    // Optional: Observability & Monitoring
    // ===========================================
    SENTRY_DSN: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    LOGFIRE_TOKEN: z.string().optional(),
});

// Type for the validated environment
type Env = z.infer<typeof envSchema>;

// Parse and validate environment variables
const parseEnv = (): Env => {
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

// Lazy-loaded environment variables
// Validation only runs when properties are first accessed, not at module load time.
// This prevents Zod validation from running during SSR in Server Components,
// which can cause runtime errors in certain Next.js contexts.
//
// IMPORTANT: Proxy Behavior Notes
// - Validation runs on FIRST property access, then cached
// - Object destructuring (const { NODE_ENV } = env) triggers full validation
// - Object spreading ({ ...env }) triggers full validation via ownKeys()
// - This is intentional: validation is deferred, not prevented
// - Once Next.js has initialized process.env (after import time), validation works correctly
let cachedEnv: Env | null = null;

const getEnv = (): Env => {
    if (!cachedEnv) {
        cachedEnv = parseEnv();
    }
    return cachedEnv;
};

/**
 * Reset the cached environment variables.
 * This is primarily for testing purposes to allow tests to modify process.env
 * and have those changes reflected in the env module.
 */
export const resetEnvCache = (): void => {
    cachedEnv = null;
};

/**
 * Explicitly validate all environment variables.
 * Call this at app startup (e.g., in middleware or root layout) to fail fast
 * if environment variables are misconfigured, rather than waiting for first access.
 *
 * @example
 * // In middleware.ts or layout.tsx
 * import { validateEnv } from '@/lib/env';
 * validateEnv(); // Throws if env is invalid
 */
export const validateEnv = (): Env => {
    return getEnv();
};

/**
 * Lazily-validated environment variables.
 *
 * This Proxy defers Zod validation until the first property is accessed.
 * All property accesses are intercepted and routed through getEnv(), which
 * validates and caches the full environment on first call.
 *
 * The `{} as Env` cast is safe because:
 * - All property access goes through the Proxy's get() trap
 * - The get() trap calls getEnv() which returns the validated Env object
 * - TypeScript correctly types the export as Env
 *
 * ⚠️ WARNING: Object destructuring triggers full validation immediately.
 * See module-level JSDoc for details.
 */
export const env: Env = new Proxy({} as Env, {
    get(_target, prop: string) {
        return getEnv()[prop as keyof Env];
    },
    has(_target, prop: string) {
        return prop in getEnv();
    },
    ownKeys() {
        return Object.keys(getEnv());
    },
    getOwnPropertyDescriptor(_target, prop: string) {
        const value = getEnv()[prop as keyof Env];
        if (value !== undefined) {
            return {
                value,
                writable: false,
                enumerable: true,
                configurable: true,
            };
        }
        return undefined;
    },
});
