/**
 * Supabase Client (Browser)
 * For use in Client Components and browser-side code
 */

import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
    // Use process.env directly for client-side to ensure Next.js injects these at build time
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
        );
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
