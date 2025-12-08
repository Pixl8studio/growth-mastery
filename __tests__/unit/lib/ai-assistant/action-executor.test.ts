import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    executePageAction,
    fillFormField,
    parseActionIntents,
} from "@/lib/ai-assistant/action-executor";
import { usePageContext } from "@/lib/ai-assistant/page-context";

vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

describe("Action Executor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        usePageContext.setState({ context: null });
    });

    describe("executePageAction", () => {
        it("should execute registered action successfully", async () => {
            const mockHandler = vi.fn().mockResolvedValue({ success: true });

            usePageContext.setState({
                context: {
                    pageId: "test-page",
                    pageName: "Test Page",
                    pageType: "form",
                    description: "Test",
                    actions: [
                        {
                            id: "save_draft",
                            label: "Save Draft",
                            description: "Save draft",
                            handler: mockHandler,
                        },
                    ],
                },
            });

            const result = await executePageAction("save_draft", { data: "test" });

            expect(result.success).toBe(true);
            expect(mockHandler).toHaveBeenCalledWith({ data: "test" });
        });

        it("should return error when no context available", async () => {
            const result = await executePageAction("save_draft");

            expect(result.success).toBe(false);
            expect(result.error).toBe("No page context available");
        });

        it("should return error when action not found", async () => {
            usePageContext.setState({
                context: {
                    pageId: "test-page",
                    pageName: "Test Page",
                    pageType: "form",
                    description: "Test",
                    actions: [],
                },
            });

            const result = await executePageAction("nonexistent");

            expect(result.success).toBe(false);
            expect(result.error).toContain("not found");
        });

        it("should handle action errors", async () => {
            const mockHandler = vi.fn().mockRejectedValue(new Error("Action failed"));

            usePageContext.setState({
                context: {
                    pageId: "test-page",
                    pageName: "Test Page",
                    pageType: "form",
                    description: "Test",
                    actions: [
                        {
                            id: "failing_action",
                            label: "Failing Action",
                            description: "Will fail",
                            handler: mockHandler,
                        },
                    ],
                },
            });

            const result = await executePageAction("failing_action");

            expect(result.success).toBe(false);
            expect(result.error).toBe("Action failed");
        });
    });

    describe("fillFormField", () => {
        it("should fill form field successfully", async () => {
            const mockUpdateFormField = vi.fn();

            usePageContext.setState({
                context: {
                    pageId: "test-page",
                    pageName: "Test Page",
                    pageType: "form",
                    description: "Test",
                    forms: [
                        {
                            id: "contact-form",
                            name: "Contact Form",
                            fields: [
                                {
                                    id: "email",
                                    name: "email",
                                    type: "email",
                                    label: "Email",
                                },
                            ],
                        },
                    ],
                },
                updateFormField: mockUpdateFormField,
            });

            // Mock DOM element
            document.body.innerHTML = '<input id="email" type="email" />';

            const result = await fillFormField(
                "contact-form",
                "email",
                "test@example.com"
            );

            expect(result.success).toBe(true);
            expect(mockUpdateFormField).toHaveBeenCalledWith(
                "contact-form",
                "email",
                "test@example.com"
            );
        });

        it("should return error when form not found", async () => {
            usePageContext.setState({
                context: {
                    pageId: "test-page",
                    pageName: "Test Page",
                    pageType: "form",
                    description: "Test",
                    forms: [],
                },
            });

            const result = await fillFormField(
                "nonexistent-form",
                "email",
                "test@example.com"
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("not found");
        });

        it("should return error when field not found", async () => {
            usePageContext.setState({
                context: {
                    pageId: "test-page",
                    pageName: "Test Page",
                    pageType: "form",
                    description: "Test",
                    forms: [
                        {
                            id: "contact-form",
                            name: "Contact Form",
                            fields: [],
                        },
                    ],
                },
            });

            const result = await fillFormField(
                "contact-form",
                "email",
                "test@example.com"
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("not found");
        });
    });

    describe("parseActionIntents", () => {
        it("should parse fill_field action intents", () => {
            const response =
                "Let me help you. [ACTION:fill_field:contact-form:email:test@example.com]";

            const intents = parseActionIntents(response);

            expect(intents).toHaveLength(1);
            expect(intents[0].actionId).toBe("fill_field");
            expect(intents[0].parameters).toEqual({
                formId: "contact-form",
                fieldId: "email",
                value: "test@example.com",
            });
        });

        it("should parse execute action intents", () => {
            const response = "I'll save that for you. [ACTION:execute:save_draft]";

            const intents = parseActionIntents(response);

            expect(intents).toHaveLength(1);
            expect(intents[0].actionId).toBe("save_draft");
        });

        it("should parse multiple action intents", () => {
            const response =
                "[ACTION:fill_field:form1:name:John] and [ACTION:execute:submit]";

            const intents = parseActionIntents(response);

            expect(intents).toHaveLength(2);
        });

        it("should return empty array when no intents found", () => {
            const response = "No actions here";

            const intents = parseActionIntents(response);

            expect(intents).toHaveLength(0);
        });
    });
});
