import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// TODO: This route needs implementation at app/api/followup/sequences/[sequenceId]/messages/[messageId]/route.ts
describe("GET /api/followup/sequences/[sequenceId]/messages/[messageId]", () => {
    it.todo("should get message by id");
    it.todo("should return 401 for unauthenticated users");
    it.todo("should return 404 when message not found");
});

describe("PUT /api/followup/sequences/[sequenceId]/messages/[messageId]", () => {
    it.todo("should update message");
    it.todo("should return 401 for unauthenticated users");
    it.todo("should return 404 when message not found");
});

describe("DELETE /api/followup/sequences/[sequenceId]/messages/[messageId]", () => {
    it.todo("should delete message");
    it.todo("should return 401 for unauthenticated users");
});
