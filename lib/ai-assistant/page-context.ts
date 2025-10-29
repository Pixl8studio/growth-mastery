/**
 * Page Context System
 * Allows pages to register their context with the AI assistant
 */

import React from "react";
import { create } from "zustand";

// Types for different context elements
export interface FormField {
    id: string;
    name: string;
    type: string;
    label: string;
    value?: string | number | boolean | null;
    required?: boolean;
    options?: Array<{ label: string; value: string }>;
    placeholder?: string;
    helpText?: string;
}

export interface PageAction {
    id: string;
    label: string;
    description: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (params?: any) => Promise<void> | void;
    parameters?: Array<{
        name: string;
        type: string;
        required: boolean;
        description: string;
    }>;
}

export interface PageContext {
    // Page identification
    pageId: string;
    pageName: string;
    pageType: string; // 'form', 'dashboard', 'editor', 'list', etc.
    description: string;

    // Current state
    currentData?: Record<string, unknown>;
    step?: number;
    totalSteps?: number;

    // Forms and fields
    forms?: Array<{
        id: string;
        name: string;
        fields: FormField[];
    }>;

    // Available actions
    actions?: PageAction[];

    // Business context (project ID, etc.)
    businessContext?: {
        projectId?: string;
        projectName?: string;
        offerId?: string;
        sequenceId?: string;
        [key: string]: unknown;
    };

    // Help information
    helpTopics?: string[];
    commonQuestions?: string[];
}

interface PageContextStore {
    context: PageContext | null;
    setContext: (context: PageContext) => void;
    updateContext: (partial: Partial<PageContext>) => void;
    clearContext: () => void;
    updateFormField: (formId: string, fieldId: string, value: unknown) => void;
    getFormattedContext: () => string;
}

/**
 * Global store for page context
 */
export const usePageContext = create<PageContextStore>((set, get) => ({
    context: null,

    setContext: (context) => set({ context }),

    updateContext: (partial) =>
        set((state) => ({
            context: state.context ? { ...state.context, ...partial } : null,
        })),

    clearContext: () => set({ context: null }),

    updateFormField: (formId, fieldId, value) =>
        set((state) => {
            if (!state.context?.forms) return state;

            const updatedForms = state.context.forms.map((form) => {
                if (form.id !== formId) return form;

                return {
                    ...form,
                    fields: form.fields.map((field) =>
                        field.id === fieldId
                            ? {
                                  ...field,
                                  value: value as string | number | boolean | null,
                              }
                            : field
                    ),
                };
            });

            return {
                context: {
                    ...state.context,
                    forms: updatedForms,
                },
            };
        }),

    getFormattedContext: () => {
        const { context } = get();
        if (!context) return "";

        const parts: string[] = [];

        // Page info
        parts.push(`Page: ${context.pageName}`);
        parts.push(`Type: ${context.pageType}`);
        parts.push(`Description: ${context.description}`);

        // Step info
        if (context.step && context.totalSteps) {
            parts.push(`Progress: Step ${context.step} of ${context.totalSteps}`);
        }

        // Business context
        if (context.businessContext?.projectName) {
            parts.push(`Project: ${context.businessContext.projectName}`);
        }

        // Forms
        if (context.forms && context.forms.length > 0) {
            parts.push("\nAvailable Forms:");
            context.forms.forEach((form) => {
                parts.push(`\n${form.name}:`);
                form.fields.forEach((field) => {
                    const required = field.required ? " (required)" : "";
                    const value = field.value ? ` = "${field.value}"` : "";
                    parts.push(`  - ${field.label}${required}${value}`);
                    if (field.helpText) {
                        parts.push(`    Help: ${field.helpText}`);
                    }
                });
            });
        }

        // Actions
        if (context.actions && context.actions.length > 0) {
            parts.push("\nAvailable Actions:");
            context.actions.forEach((action) => {
                parts.push(`  - ${action.label}: ${action.description}`);
                if (action.parameters && action.parameters.length > 0) {
                    parts.push(`    Parameters:`);
                    action.parameters.forEach((param) => {
                        const req = param.required ? " (required)" : "";
                        parts.push(
                            `      - ${param.name} (${param.type})${req}: ${param.description}`
                        );
                    });
                }
            });
        }

        // Help topics
        if (context.helpTopics && context.helpTopics.length > 0) {
            parts.push("\nHelp Topics:");
            context.helpTopics.forEach((topic) => {
                parts.push(`  - ${topic}`);
            });
        }

        return parts.join("\n");
    },
}));

/**
 * Hook to register page context
 * Call this in your page component to make it AI-assistant aware
 */
export function useRegisterPageContext(context: PageContext) {
    const { setContext, clearContext } = usePageContext();

    // Register on mount, clear on unmount
    React.useEffect(() => {
        setContext(context);
        return () => clearContext();
    }, [context, setContext, clearContext]);
}
