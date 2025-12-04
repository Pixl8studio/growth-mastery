/**
 * PostVariantCard Component Tests
 * Tests basic variant card (re-exports enhanced version)
 */

import { describe, it, expect } from "vitest";
import { PostVariantCard } from "@/components/marketing/post-variant-card";
import { PostVariantCardEnhanced } from "@/components/marketing/post-variant-card-enhanced";

describe("PostVariantCard", () => {
    it("should re-export PostVariantCardEnhanced", () => {
        expect(PostVariantCard).toBe(PostVariantCardEnhanced);
    });
});
