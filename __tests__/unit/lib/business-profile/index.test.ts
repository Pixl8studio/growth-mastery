/**
 * Business Profile Module Index Tests
 */

import { describe, it, expect } from "vitest";
import * as BusinessProfile from "@/lib/business-profile";

describe("Business Profile Module Exports", () => {
    it("should export service functions", () => {
        expect(BusinessProfile.getOrCreateProfile).toBeDefined();
        expect(BusinessProfile.getProfile).toBeDefined();
        expect(BusinessProfile.getProfileByProject).toBeDefined();
        expect(BusinessProfile.updateProfile).toBeDefined();
        expect(BusinessProfile.updateSection).toBeDefined();
        expect(BusinessProfile.deleteProfile).toBeDefined();
        expect(BusinessProfile.getUserProfiles).toBeDefined();
        expect(BusinessProfile.populateFromIntake).toBeDefined();
    });

    it("should export AI section generator functions", () => {
        expect(BusinessProfile.generateSectionAnswers).toBeDefined();
        expect(BusinessProfile.parseGptPasteResponse).toBeDefined();
        expect(BusinessProfile.generateGptCopyPrompt).toBeDefined();
    });

    it("should export generator integration functions", () => {
        expect(BusinessProfile.loadGeneratorContext).toBeDefined();
        expect(BusinessProfile.buildPromptContext).toBeDefined();
        expect(BusinessProfile.getMergedGenerationContext).toBeDefined();
    });

    it("should export all functions as callable", () => {
        expect(typeof BusinessProfile.getOrCreateProfile).toBe("function");
        expect(typeof BusinessProfile.generateSectionAnswers).toBe("function");
        expect(typeof BusinessProfile.loadGeneratorContext).toBe("function");
    });
});
