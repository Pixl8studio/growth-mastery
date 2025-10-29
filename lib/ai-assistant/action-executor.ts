/**
 * Action Executor
 * Allows AI assistant to trigger actions on the page
 */

import { usePageContext } from "./page-context";
import { logger } from "@/lib/client-logger";

export interface ActionRequest {
    actionId: string;
    parameters?: Record<string, any>;
}

export interface ActionResult {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
}

/**
 * Execute an action registered by the current page
 */
export async function executePageAction(
    actionId: string,
    parameters?: Record<string, any>
): Promise<ActionResult> {
    try {
        const context = usePageContext.getState().context;

        if (!context) {
            return {
                success: false,
                error: "No page context available",
            };
        }

        const action = context.actions?.find((a) => a.id === actionId);

        if (!action) {
            return {
                success: false,
                error: `Action '${actionId}' not found`,
            };
        }

        logger.info({ actionId, parameters }, "🤖 Executing AI action");

        // Execute the action
        const result = await action.handler(parameters);

        logger.info({ actionId, success: true }, "✅ AI action completed");

        return {
            success: true,
            message: `${action.label} completed successfully`,
            data: result,
        };
    } catch (error) {
        logger.error({ error, actionId }, "❌ AI action failed");

        return {
            success: false,
            error: error instanceof Error ? error.message : "Action failed",
        };
    }
}

/**
 * Fill a form field with AI-provided value
 */
export async function fillFormField(
    formId: string,
    fieldId: string,
    value: any
): Promise<ActionResult> {
    try {
        const { context, updateFormField } = usePageContext.getState();

        if (!context) {
            return {
                success: false,
                error: "No page context available",
            };
        }

        const form = context.forms?.find((f) => f.id === formId);
        if (!form) {
            return {
                success: false,
                error: `Form '${formId}' not found`,
            };
        }

        const field = form.fields.find((f) => f.id === fieldId);
        if (!field) {
            return {
                success: false,
                error: `Field '${fieldId}' not found`,
            };
        }

        logger.info({ formId, fieldId, value }, "🤖 Filling form field");

        // Update the field value in context
        updateFormField(formId, fieldId, value);

        // Trigger the actual DOM update
        const inputElement = document.getElementById(fieldId) as
            | HTMLInputElement
            | HTMLTextAreaElement
            | HTMLSelectElement;

        if (inputElement) {
            // Set value
            if (
                inputElement instanceof HTMLInputElement ||
                inputElement instanceof HTMLTextAreaElement
            ) {
                inputElement.value = String(value);
            } else if (inputElement instanceof HTMLSelectElement) {
                inputElement.value = String(value);
            }

            // Dispatch change event
            const event = new Event("input", { bubbles: true });
            inputElement.dispatchEvent(event);

            const changeEvent = new Event("change", { bubbles: true });
            inputElement.dispatchEvent(changeEvent);
        }

        return {
            success: true,
            message: `Field '${field.label}' updated`,
        };
    } catch (error) {
        logger.error({ error, formId, fieldId }, "❌ Failed to fill form field");

        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fill field",
        };
    }
}

/**
 * Fill multiple form fields at once
 */
export async function fillMultipleFields(
    formId: string,
    fields: Array<{ fieldId: string; value: any }>
): Promise<ActionResult> {
    try {
        const results = await Promise.all(
            fields.map((field) => fillFormField(formId, field.fieldId, field.value))
        );

        const failed = results.filter((r) => !r.success);

        if (failed.length > 0) {
            return {
                success: false,
                error: `Failed to fill ${failed.length} field(s)`,
            };
        }

        return {
            success: true,
            message: `Successfully filled ${fields.length} field(s)`,
        };
    } catch (error) {
        logger.error({ error, formId }, "❌ Failed to fill multiple fields");

        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fill fields",
        };
    }
}

/**
 * Parse AI response for action intents
 * Looks for structured commands in AI responses like:
 * [ACTION:fill_field:form1:name:John Doe]
 * [ACTION:execute:save_draft]
 */
export function parseActionIntents(aiResponse: string): ActionRequest[] {
    const actionPattern = /\[ACTION:([^:]+):([^\]]+)\]/g;
    const matches = Array.from(aiResponse.matchAll(actionPattern));

    return matches.map((match) => {
        const [, actionType, ...params] = match;

        if (actionType === "fill_field") {
            const [formId, fieldId, ...valueParts] = params;
            return {
                actionId: "fill_field",
                parameters: {
                    formId,
                    fieldId,
                    value: valueParts.join(":"),
                },
            };
        } else if (actionType === "execute") {
            const [actionId, ...paramParts] = params;
            return {
                actionId,
                parameters: paramParts.length > 0 ? { args: paramParts } : undefined,
            };
        }

        return {
            actionId: actionType,
            parameters: { args: params },
        };
    });
}
