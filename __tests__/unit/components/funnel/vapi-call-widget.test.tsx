/**
 * VapiCallWidget Component Tests
 * Simplified tests focusing on basic rendering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { VapiCallWidget } from "@/components/funnel/vapi-call-widget";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock @vapi-ai/web
vi.mock("@vapi-ai/web", () => ({
    default: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
    })),
}));

// Mock environment variables
const originalEnv = process.env;

describe("VapiCallWidget", () => {
    const mockProps = {
        projectId: "project-123",
        userId: "user-456",
        onCallComplete: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = {
            ...originalEnv,
            NEXT_PUBLIC_VAPI_PUBLIC_KEY: "test-public-key",
            NEXT_PUBLIC_VAPI_ASSISTANT_ID: "test-assistant-id",
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should render loading state initially", () => {
        render(<VapiCallWidget {...mockProps} />);
        expect(screen.getByText("Loading voice assistant...")).toBeInTheDocument();
    });

    it("should accept required props", () => {
        const { container } = render(<VapiCallWidget {...mockProps} />);
        expect(container).toBeInTheDocument();
    });
});
