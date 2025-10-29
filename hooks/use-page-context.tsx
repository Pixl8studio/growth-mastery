/**
 * React Hook for Page Context Registration
 * Makes usePageContext work as a proper React hook
 */

"use client";

import { useEffect } from "react";
import {
    usePageContext as usePageContextStore,
    PageContext,
} from "@/lib/ai-assistant/page-context";

/**
 * Register page context for AI assistant
 * Call this hook in your page component to make it AI-assistant aware
 */
export function usePageContextRegistration(context: PageContext) {
    const { setContext, clearContext } = usePageContextStore();

    useEffect(() => {
        setContext(context);
        return () => clearContext();
    }, [context, setContext, clearContext]);
}

// Re-export the store hook for accessing context
export { usePageContext } from "@/lib/ai-assistant/page-context";
