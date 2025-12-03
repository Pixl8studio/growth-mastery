/**
 * Smoke Test: Hit all API routes to discover errors
 *
 * This script makes requests to API endpoints to trigger any runtime errors
 * that Sentry can capture. Run with: pnpm tsx scripts/smoke-test-apis.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface TestResult {
    endpoint: string;
    method: string;
    status: number | "ERROR";
    error?: string;
    duration: number;
}

const results: TestResult[] = [];

async function testEndpoint(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: Record<string, unknown>
): Promise<TestResult> {
    const start = Date.now();
    const endpoint = `${BASE_URL}${path}`;

    try {
        const response = await fetch(endpoint, {
            method,
            headers: {
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        return {
            endpoint: path,
            method,
            status: response.status,
            duration: Date.now() - start,
        };
    } catch (error) {
        return {
            endpoint: path,
            method,
            status: "ERROR",
            error: error instanceof Error ? error.message : String(error),
            duration: Date.now() - start,
        };
    }
}

async function runSmokeTests() {
    console.log("🔥 Starting API Smoke Tests...\n");
    console.log(`Base URL: ${BASE_URL}\n`);

    // Health check first
    results.push(await testEndpoint("GET", "/api/health"));

    // Auth endpoints (safe to call)
    results.push(
        await testEndpoint("POST", "/api/auth/validate-referral", { code: "TEST" })
    );

    // Public/safe GET endpoints
    const safeGetEndpoints = [
        "/api/contacts",
        "/api/domains",
        "/api/marketing/templates",
        "/api/marketing/trends",
        "/api/marketing/briefs",
        "/api/marketing/calendar",
        "/api/marketing/profiles",
        "/api/marketing/analytics",
        "/api/marketing/activity-log",
        "/api/marketing/variants/approval-queue",
        "/api/followup/sequences",
        "/api/followup/prospects",
        "/api/followup/stories",
        "/api/followup/agent-configs",
        "/api/followup/analytics",
        "/api/followup/global-analytics",
        "/api/followup/global-prospects",
        "/api/followup/gmail/status",
        "/api/ads/accounts",
        "/api/analytics/funnel",
    ];

    for (const endpoint of safeGetEndpoints) {
        results.push(await testEndpoint("GET", endpoint));
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Context endpoints
    results.push(await testEndpoint("GET", "/api/context/business-profile"));
    results.push(await testEndpoint("GET", "/api/ai-assistant/context"));

    // Generation endpoints (POST with minimal body to trigger validation)
    const generationEndpoints = [
        { path: "/api/generate/offer", body: { projectId: "test" } },
        { path: "/api/generate/deck-structure", body: { projectId: "test" } },
        { path: "/api/generate/enrollment-copy", body: { projectId: "test" } },
        { path: "/api/generate/registration-copy", body: { projectId: "test" } },
        { path: "/api/generate/watch-copy", body: { projectId: "test" } },
    ];

    for (const { path, body } of generationEndpoints) {
        results.push(await testEndpoint("POST", path, body));
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Intake endpoints
    results.push(await testEndpoint("POST", "/api/intake/paste", { content: "test" }));
    results.push(
        await testEndpoint("POST", "/api/intake/scrape", { url: "https://example.com" })
    );

    // Print results
    console.log("\n📊 Results:\n");
    console.log("─".repeat(80));

    const grouped = {
        success: results.filter(
            (r) => typeof r.status === "number" && r.status >= 200 && r.status < 300
        ),
        clientError: results.filter(
            (r) => typeof r.status === "number" && r.status >= 400 && r.status < 500
        ),
        serverError: results.filter(
            (r) => typeof r.status === "number" && r.status >= 500
        ),
        networkError: results.filter((r) => r.status === "ERROR"),
    };

    console.log(`\n✅ Success (2xx): ${grouped.success.length}`);
    grouped.success.forEach((r) =>
        console.log(`   ${r.method} ${r.endpoint} - ${r.status} (${r.duration}ms)`)
    );

    console.log(`\n⚠️  Client Errors (4xx): ${grouped.clientError.length}`);
    grouped.clientError.forEach((r) =>
        console.log(`   ${r.method} ${r.endpoint} - ${r.status} (${r.duration}ms)`)
    );

    console.log(`\n🔴 Server Errors (5xx): ${grouped.serverError.length}`);
    grouped.serverError.forEach((r) =>
        console.log(`   ${r.method} ${r.endpoint} - ${r.status} (${r.duration}ms)`)
    );

    console.log(`\n❌ Network Errors: ${grouped.networkError.length}`);
    grouped.networkError.forEach((r) =>
        console.log(`   ${r.method} ${r.endpoint} - ${r.error}`)
    );

    console.log("\n" + "─".repeat(80));
    console.log(`\nTotal: ${results.length} endpoints tested`);
    console.log(`Server errors (5xx) will appear in Sentry! 🎯\n`);

    // Return exit code based on server errors
    if (grouped.serverError.length > 0 || grouped.networkError.length > 0) {
        process.exit(1);
    }
}

runSmokeTests().catch(console.error);
