/**
 * Unit Tests: Supabase Client (Browser)
 * Tests for lib/supabase/client.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { createBrowserClient } from "@supabase/ssr";

vi.mock("@supabase/ssr", () => ({
    createBrowserClient: vi.fn(),
}));

describe("Supabase Client (Browser)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createClient", () => {
        it("creates a browser client with the configured URL and key", () => {
            const mockClient = { from: vi.fn(), auth: vi.fn() };
            (createBrowserClient as ReturnType<typeof vi.fn>).mockReturnValue(
                mockClient
            );

            const client = createClient();

            expect(createBrowserClient).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String)
            );
            expect(client).toBe(mockClient);
        });
    });
});
