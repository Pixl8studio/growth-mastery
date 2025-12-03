import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// TODO: This route needs implementation at app/api/followup/sequences/[sequenceId]/messages/[messageId]/regenerate/route.ts
describe("POST /api/followup/sequences/[sequenceId]/messages/[messageId]/regenerate", () => {
    it.todo("should regenerate message content");
    it.todo("should return 401 for unauthenticated users");
    it.todo("should return 404 when message not found");
    it.todo("should return 400 for invalid regeneration options");
});
