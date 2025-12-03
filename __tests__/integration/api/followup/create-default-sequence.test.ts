import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// TODO: This route needs implementation at app/api/followup/sequences/create-default/route.ts
describe("POST /api/followup/sequences/create-default", () => {
    it.todo("should create default sequence");
    it.todo("should return 401 for unauthenticated users");
    it.todo("should return 400 for missing agent_config_id");
    it.todo("should include default messages");
});
