/**
 * Unit tests for lib/env.ts
 * Tests environment variable validation and parsing
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

describe("lib/env", () => {
    beforeEach(() => {
        // Reset modules to get fresh env parsing
        vi.resetModules();
        // Clear all environment stubs
        vi.unstubAllEnvs();
    });

    describe("environment variable parsing", () => {
        it("should parse valid environment variables successfully", async () => {
            vi.stubEnv("NODE_ENV", "production");
            vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com");
            vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.com");
            vi.stubEnv("OPENAI_API_KEY", "sk-test-key");

            const { env } = await import("@/lib/env");

            expect(env.NODE_ENV).toBe("production");
            expect(env.NEXT_PUBLIC_APP_URL).toBe("https://example.com");
            expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://supabase.example.com");
            expect(env.OPENAI_API_KEY).toBe("sk-test-key");
        }, 10000);

        it("should use default values for optional variables", async () => {
            vi.stubEnv("NODE_ENV", "development");
            // Don't set stripe values to test defaults

            const { env } = await import("@/lib/env");

            expect(env.NODE_ENV).toBe("development");
            expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
            // Note: Default values from schema
            expect(typeof env.STRIPE_PLATFORM_FEE_PERCENT).toBe("number");
            expect(typeof env.STRIPE_PLATFORM_FEE_FIXED).toBe("number");
        });

        it("should handle test environment", async () => {
            vi.stubEnv("NODE_ENV", "test");

            const { env } = await import("@/lib/env");

            expect(env.NODE_ENV).toBe("test");
        });

        it("should default NODE_ENV to development", async () => {
            vi.stubEnv("NODE_ENV", undefined);

            const { env } = await import("@/lib/env");

            expect(env.NODE_ENV).toBe("development");
        });

        it("should validate URL format for NEXT_PUBLIC_APP_URL", async () => {
            vi.stubEnv("NEXT_PUBLIC_APP_URL", "not-a-url");

            const { env, resetEnvCache } = await import("@/lib/env");
            resetEnvCache();

            // Validation is lazy - it throws on first property access
            expect(() => env.NODE_ENV).toThrow();
        });

        it("should validate URL format for NEXT_PUBLIC_SUPABASE_URL", async () => {
            vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "invalid-url");

            const { env, resetEnvCache } = await import("@/lib/env");
            resetEnvCache();

            // Validation is lazy - it throws on first property access
            expect(() => env.NODE_ENV).toThrow();
        });

        it("should allow optional Supabase variables to be undefined", async () => {
            vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
            vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
            vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);

            const { env } = await import("@/lib/env");

            expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
            expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeUndefined();
            expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
        });

        it("should allow optional AI variables to be undefined", async () => {
            vi.stubEnv("ANTHROPIC_API_KEY", undefined);
            vi.stubEnv("OPENAI_API_KEY", undefined);

            const { env } = await import("@/lib/env");

            expect(env.ANTHROPIC_API_KEY).toBeUndefined();
            expect(env.OPENAI_API_KEY).toBeUndefined();
        });

        it("should allow optional Stripe variables to be undefined", async () => {
            vi.stubEnv("STRIPE_SECRET_KEY", undefined);
            vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", undefined);
            vi.stubEnv("STRIPE_WEBHOOK_SECRET", undefined);

            const { env } = await import("@/lib/env");

            expect(env.STRIPE_SECRET_KEY).toBeUndefined();
            expect(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBeUndefined();
            expect(env.STRIPE_WEBHOOK_SECRET).toBeUndefined();
        });

        it("should coerce string numbers to numbers for Stripe fees", async () => {
            vi.stubEnv("STRIPE_PLATFORM_FEE_PERCENT", "15");
            vi.stubEnv("STRIPE_PLATFORM_FEE_FIXED", "100");

            const { env } = await import("@/lib/env");

            expect(env.STRIPE_PLATFORM_FEE_PERCENT).toBe(15);
            expect(env.STRIPE_PLATFORM_FEE_FIXED).toBe(100);
        });

        it("should handle all social media integration variables", async () => {
            vi.stubEnv("FACEBOOK_APP_ID", "facebook-id");
            vi.stubEnv("FACEBOOK_APP_SECRET", "facebook-secret");
            vi.stubEnv("INSTAGRAM_CLIENT_ID", "instagram-id");
            vi.stubEnv("INSTAGRAM_CLIENT_SECRET", "instagram-secret");
            vi.stubEnv("TWITTER_CLIENT_ID", "twitter-id");
            vi.stubEnv("TWITTER_CLIENT_SECRET", "twitter-secret");
            vi.stubEnv("LINKEDIN_CLIENT_ID", "linkedin-id");
            vi.stubEnv("LINKEDIN_CLIENT_SECRET", "linkedin-secret");

            const { env } = await import("@/lib/env");

            expect(env.FACEBOOK_APP_ID).toBe("facebook-id");
            expect(env.INSTAGRAM_CLIENT_ID).toBe("instagram-id");
            expect(env.TWITTER_CLIENT_ID).toBe("twitter-id");
            expect(env.LINKEDIN_CLIENT_ID).toBe("linkedin-id");
        });

        it("should handle Google OAuth variables", async () => {
            vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
            vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-secret");
            vi.stubEnv("GMAIL_REDIRECT_URI", "https://example.com/callback");

            const { env } = await import("@/lib/env");

            expect(env.GOOGLE_CLIENT_ID).toBe("google-client-id");
            expect(env.GOOGLE_CLIENT_SECRET).toBe("google-secret");
            expect(env.GMAIL_REDIRECT_URI).toBe("https://example.com/callback");
        });

        it("should handle integration encryption key", async () => {
            vi.stubEnv("INTEGRATION_ENCRYPTION_KEY", "test-encryption-key-32-chars");

            const { env } = await import("@/lib/env");

            expect(env.INTEGRATION_ENCRYPTION_KEY).toBe("test-encryption-key-32-chars");
        });

        it("should handle Vercel configuration", async () => {
            vi.stubEnv("VERCEL_TOKEN", "vercel-token");
            vi.stubEnv("VERCEL_PROJECT_ID", "project-id");
            vi.stubEnv("VERCEL_TEAM_ID", "team-id");

            const { env } = await import("@/lib/env");

            expect(env.VERCEL_TOKEN).toBe("vercel-token");
            expect(env.VERCEL_PROJECT_ID).toBe("project-id");
            expect(env.VERCEL_TEAM_ID).toBe("team-id");
        });

        it("should handle observability variables", async () => {
            vi.stubEnv("SENTRY_DSN", "https://sentry.example.com/1");
            vi.stubEnv("SENTRY_AUTH_TOKEN", "sentry-token");
            vi.stubEnv("LOGFIRE_TOKEN", "logfire-token");

            const { env } = await import("@/lib/env");

            expect(env.SENTRY_DSN).toBe("https://sentry.example.com/1");
            expect(env.SENTRY_AUTH_TOKEN).toBe("sentry-token");
            expect(env.LOGFIRE_TOKEN).toBe("logfire-token");
        });

        it("should handle VAPI configuration", async () => {
            vi.stubEnv("VAPI_API_KEY", "vapi-key");
            vi.stubEnv("VAPI_PHONE_NUMBER_ID", "phone-id");
            vi.stubEnv("VAPI_WEBHOOK_SECRET", "webhook-secret");

            const { env } = await import("@/lib/env");

            expect(env.VAPI_API_KEY).toBe("vapi-key");
            expect(env.VAPI_PHONE_NUMBER_ID).toBe("phone-id");
            expect(env.VAPI_WEBHOOK_SECRET).toBe("webhook-secret");
        });

        it("should handle Cloudflare configuration", async () => {
            vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "cloudflare-account");
            vi.stubEnv("CLOUDFLARE_STREAM_API_TOKEN", "stream-token");

            const { env } = await import("@/lib/env");

            expect(env.CLOUDFLARE_ACCOUNT_ID).toBe("cloudflare-account");
            expect(env.CLOUDFLARE_STREAM_API_TOKEN).toBe("stream-token");
        });

        it("should handle Gamma API configuration", async () => {
            vi.stubEnv("GAMMA_API_KEY", "gamma-key");

            const { env } = await import("@/lib/env");

            expect(env.GAMMA_API_KEY).toBe("gamma-key");
        });

        it("should reject invalid NODE_ENV values", async () => {
            vi.stubEnv("NODE_ENV", "invalid");

            const { env, resetEnvCache } = await import("@/lib/env");
            resetEnvCache();

            // Validation is lazy - it throws on first property access
            expect(() => env.NODE_ENV).toThrow();
        });

        it("should provide helpful error message for validation failures", async () => {
            vi.stubEnv("NEXT_PUBLIC_APP_URL", "not-a-url");

            const { env, resetEnvCache } = await import("@/lib/env");
            resetEnvCache();

            // Validation is lazy - it throws on first property access
            try {
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                env.NODE_ENV;
                expect.fail("Should have thrown error");
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain(
                    "Invalid environment variables"
                );
            }
        });
    });

    describe("type safety", () => {
        it("should export env object with proper types", async () => {
            vi.stubEnv("NODE_ENV", "production");
            vi.stubEnv("STRIPE_PLATFORM_FEE_PERCENT", "25");

            const { env } = await import("@/lib/env");

            // These should be typed correctly
            const nodeEnv: "development" | "test" | "production" = env.NODE_ENV;
            const feePercent: number = env.STRIPE_PLATFORM_FEE_PERCENT;

            expect(nodeEnv).toBe("production");
            expect(feePercent).toBe(25);
        });
    });

    describe("lazy-loading behavior", () => {
        it("should NOT validate until first property access", async () => {
            // Set up an invalid URL that would fail validation
            vi.stubEnv("NEXT_PUBLIC_APP_URL", "not-a-valid-url");

            // Import the module - this should NOT throw
            // Validation is deferred until first property access
            const envModule = await import("@/lib/env");

            // Reset cache to ensure we test fresh validation
            envModule.resetEnvCache();

            // NOW accessing a property should trigger validation and throw
            expect(() => envModule.env.NODE_ENV).toThrow(
                "Invalid environment variables"
            );
        });

        it("should cache validation result after first access", async () => {
            vi.stubEnv("NODE_ENV", "production");

            const { env, resetEnvCache } = await import("@/lib/env");
            resetEnvCache();

            // First access triggers validation
            const firstAccess = env.NODE_ENV;
            expect(firstAccess).toBe("production");

            // Change the env var
            vi.stubEnv("NODE_ENV", "development");

            // Second access should return cached value (still "production")
            const secondAccess = env.NODE_ENV;
            expect(secondAccess).toBe("production");

            // After reset, should pick up new value
            resetEnvCache();
            const afterReset = env.NODE_ENV;
            expect(afterReset).toBe("development");
        });

        it("should allow resetEnvCache to clear cached validation", async () => {
            vi.stubEnv("NODE_ENV", "test");

            const { env, resetEnvCache } = await import("@/lib/env");
            resetEnvCache();

            // Access to populate cache
            expect(env.NODE_ENV).toBe("test");

            // Change env
            vi.stubEnv("NODE_ENV", "production");

            // Still cached
            expect(env.NODE_ENV).toBe("test");

            // Reset and verify new value is read
            resetEnvCache();
            expect(env.NODE_ENV).toBe("production");
        });
    });
});
