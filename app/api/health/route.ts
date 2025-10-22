/**
 * Health Check API Route
 * Returns application health status
 */

import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
    return NextResponse.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        version: process.env.npm_package_version || "unknown",
    });
}
