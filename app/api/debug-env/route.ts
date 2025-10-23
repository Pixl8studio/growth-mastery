/**
 * Debug Environment Variables
 * Shows what environment variables are available (safely)
 */

import { NextResponse } from "next/server";

export async function GET() {
    const envVars = {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseUrlFirst20: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20),
        anonKeyFirst20: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20),
        nodeEnv: process.env.NODE_ENV,
        allPublicEnvVars: Object.keys(process.env).filter((key) =>
            key.startsWith("NEXT_PUBLIC_")
        ),
    };

    return NextResponse.json(envVars);
}
