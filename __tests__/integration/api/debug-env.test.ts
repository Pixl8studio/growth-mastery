import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/debug-env/route";

describe("Debug Env API Route", () => {
    describe("GET /api/debug-env", () => {
        it("returns environment variables info", async () => {
            const response = await GET();
            const data = await response.json();

            expect(data).toHaveProperty("hasSupabaseUrl");
            expect(data).toHaveProperty("hasSupabaseAnonKey");
            expect(data).toHaveProperty("nodeEnv");
            expect(data).toHaveProperty("allPublicEnvVars");
        });

        it("does not expose full secrets", async () => {
            const response = await GET();
            const data = await response.json();

            expect(typeof data.hasSupabaseUrl).toBe("boolean");
            expect(typeof data.hasSupabaseAnonKey).toBe("boolean");

            if (data.supabaseUrlFirst20) {
                expect(data.supabaseUrlFirst20.length).toBeLessThanOrEqual(20);
            }
        });

        it("lists only NEXT_PUBLIC_ variables", async () => {
            const response = await GET();
            const data = await response.json();

            expect(Array.isArray(data.allPublicEnvVars)).toBe(true);
            data.allPublicEnvVars.forEach((key: string) => {
                expect(key).toMatch(/^NEXT_PUBLIC_/);
            });
        });
    });
});
