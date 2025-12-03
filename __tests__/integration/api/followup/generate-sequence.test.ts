import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// TODO: This route needs implementation at app/api/followup/sequences/generate/route.ts
describe("POST /api/followup/sequences/generate", () => {
    it.todo("should generate AI-powered sequence");
    it.todo("should return 401 for unauthenticated users");
    it.todo("should return 400 for invalid parameters");
    it.todo("should use agent config for generation");
});
