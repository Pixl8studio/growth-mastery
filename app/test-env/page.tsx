"use client";

/**
 * Environment Variables Test Page
 * Shows what env vars are available on the client side
 */

export default function TestEnvPage() {
    // These values are replaced at BUILD time by Next.js
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-2xl">
                <h1 className="mb-8 text-3xl font-bold">Environment Variables Test</h1>

                <div className="space-y-4 rounded-lg bg-white p-6 shadow">
                    <div>
                        <h2 className="mb-2 text-lg font-semibold">
                            NEXT_PUBLIC_SUPABASE_URL:
                        </h2>
                        <p className="rounded bg-gray-100 p-3 font-mono text-sm">
                            {supabaseUrl || "❌ undefined"}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                            {supabaseUrl ? "✅ Loaded" : "❌ Not loaded"}
                        </p>
                    </div>

                    <div>
                        <h2 className="mb-2 text-lg font-semibold">
                            NEXT_PUBLIC_SUPABASE_ANON_KEY:
                        </h2>
                        <p className="rounded bg-gray-100 p-3 font-mono text-sm break-all">
                            {supabaseAnonKey
                                ? `${supabaseAnonKey.substring(0, 50)}...`
                                : "❌ undefined"}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                            {supabaseAnonKey ? "✅ Loaded" : "❌ Not loaded"}
                        </p>
                    </div>

                    <div className="border-t pt-4">
                        <h2 className="mb-2 text-lg font-semibold">
                            All NEXT_PUBLIC_* variables:
                        </h2>
                        <pre className="rounded bg-gray-100 p-3 text-sm overflow-auto">
                            {JSON.stringify(
                                {
                                    NEXT_PUBLIC_APP_URL:
                                        process.env.NEXT_PUBLIC_APP_URL,
                                    NEXT_PUBLIC_SUPABASE_URL:
                                        process.env.NEXT_PUBLIC_SUPABASE_URL,
                                    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env
                                        .NEXT_PUBLIC_SUPABASE_ANON_KEY
                                        ? "defined"
                                        : undefined,
                                    NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID:
                                        process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID,
                                },
                                null,
                                2
                            )}
                        </pre>
                    </div>

                    <div className="border-t pt-4">
                        <p className="text-sm text-gray-600">
                            If you see "undefined" above, it means Next.js didn't embed
                            the environment variables into the client-side JavaScript
                            bundle.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
