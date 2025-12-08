import { describe, it, expect, beforeEach } from "vitest";
import { usePageContext } from "@/lib/ai-assistant/page-context";
import type { PageContext } from "@/lib/ai-assistant/page-context";

describe("Page Context", () => {
    beforeEach(() => {
        usePageContext.setState({ context: null });
    });

    describe("setContext", () => {
        it("should set page context", () => {
            const context: PageContext = {
                pageId: "test-page",
                pageName: "Test Page",
                pageType: "form",
                description: "Test page description",
            };

            usePageContext.getState().setContext(context);

            const state = usePageContext.getState();
            expect(state.context).toEqual(context);
        });
    });

    describe("updateContext", () => {
        it("should update partial context", () => {
            const initialContext: PageContext = {
                pageId: "test-page",
                pageName: "Test Page",
                pageType: "form",
                description: "Initial description",
            };

            usePageContext.getState().setContext(initialContext);
            usePageContext.getState().updateContext({
                description: "Updated description",
                step: 2,
                totalSteps: 5,
            });

            const state = usePageContext.getState();
            expect(state.context?.description).toBe("Updated description");
            expect(state.context?.step).toBe(2);
            expect(state.context?.totalSteps).toBe(5);
            expect(state.context?.pageName).toBe("Test Page");
        });

        it("should not update when no context exists", () => {
            usePageContext.getState().updateContext({ step: 3 });

            const state = usePageContext.getState();
            expect(state.context).toBeNull();
        });
    });

    describe("clearContext", () => {
        it("should clear context", () => {
            const context: PageContext = {
                pageId: "test-page",
                pageName: "Test Page",
                pageType: "form",
                description: "Test",
            };

            usePageContext.getState().setContext(context);
            usePageContext.getState().clearContext();

            const state = usePageContext.getState();
            expect(state.context).toBeNull();
        });
    });

    describe("updateFormField", () => {
        it("should update form field value", () => {
            const context: PageContext = {
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
                                value: "",
                            },
                            {
                                id: "name",
                                name: "name",
                                type: "text",
                                label: "Name",
                                value: "",
                            },
                        ],
                    },
                ],
            };

            usePageContext.getState().setContext(context);
            usePageContext
                .getState()
                .updateFormField("contact-form", "email", "test@example.com");

            const state = usePageContext.getState();
            const emailField = state.context?.forms?.[0].fields.find(
                (f) => f.id === "email"
            );
            expect(emailField?.value).toBe("test@example.com");
        });

        it("should not update field in wrong form", () => {
            const context: PageContext = {
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
                                value: "original@example.com",
                            },
                        ],
                    },
                ],
            };

            usePageContext.getState().setContext(context);
            usePageContext
                .getState()
                .updateFormField("other-form", "email", "new@example.com");

            const state = usePageContext.getState();
            const emailField = state.context?.forms?.[0].fields.find(
                (f) => f.id === "email"
            );
            expect(emailField?.value).toBe("original@example.com");
        });
    });

    describe("getFormattedContext", () => {
        it("should format context as string", () => {
            const context: PageContext = {
                pageId: "test-page",
                pageName: "Test Page",
                pageType: "form",
                description: "A test form page",
                step: 2,
                totalSteps: 5,
                forms: [
                    {
                        id: "contact-form",
                        name: "Contact Form",
                        fields: [
                            {
                                id: "email",
                                name: "email",
                                type: "email",
                                label: "Email Address",
                                required: true,
                                value: "test@example.com",
                            },
                        ],
                    },
                ],
                actions: [
                    {
                        id: "save",
                        label: "Save Form",
                        description: "Save the form data",
                        handler: async () => {},
                    },
                ],
            };

            usePageContext.getState().setContext(context);
            const formatted = usePageContext.getState().getFormattedContext();

            expect(formatted).toContain("Test Page");
            expect(formatted).toContain("form");
            expect(formatted).toContain("Step 2 of 5");
            expect(formatted).toContain("Contact Form");
            expect(formatted).toContain("Email Address");
            expect(formatted).toContain("required");
            expect(formatted).toContain("Save Form");
        });

        it("should return empty string when no context", () => {
            const formatted = usePageContext.getState().getFormattedContext();
            expect(formatted).toBe("");
        });
    });
});
