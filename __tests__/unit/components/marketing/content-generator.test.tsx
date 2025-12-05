/**
 * ContentGenerator Component Tests
 * Tests basic content generator (re-exports enhanced version)
 */

import { describe, it, expect } from "vitest";
import { ContentGenerator } from "@/components/marketing/content-generator";
import { ContentGeneratorEnhanced } from "@/components/marketing/content-generator-enhanced";

describe("ContentGenerator", () => {
    it("should re-export ContentGeneratorEnhanced", () => {
        expect(ContentGenerator).toBe(ContentGeneratorEnhanced);
    });
});
