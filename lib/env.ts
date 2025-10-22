/**
 * Environment Variables Configuration
 * Validates and exports environment variables with type safety
 */

import { z } from "zod";

const envSchema = z.object({
    // Node Environment
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // App URLs
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

    // Supabase Configuration
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
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
