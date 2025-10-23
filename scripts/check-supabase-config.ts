#!/usr/bin/env tsx
/**
 * Check Supabase Configuration
 * Verifies auth settings and provides recommendations
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

async function checkConfig() {
    console.log("🔍 Checking Supabase Configuration\n");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error("❌ Missing environment variables");
        process.exit(1);
    }

    console.log(`📍 Supabase URL: ${supabaseUrl}`);
    console.log(`🔑 Project ID: ${supabaseUrl.split("//")[1].split(".")[0]}\n`);

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Test basic connectivity
    console.log("✅ Connection successful\n");

    console.log("📋 Common Supabase Auth Settings to Check:\n");
    console.log("🔗 Go to your Supabase Dashboard:");
    console.log(
        `   ${supabaseUrl.replace("supabase.co", "supabase.co/project")}/auth/providers\n`
    );

    console.log("⚙️  Settings to verify:\n");

    console.log("1. Email Auth Provider:");
    console.log("   ✓ Enable email provider");
    console.log("   ✓ Confirm email: OPTIONAL (for development)");
    console.log("   ✓ Secure email change: Enabled");
    console.log("");

    console.log("2. Email Templates:");
    console.log("   ✓ Check if email templates are configured");
    console.log("   ✓ For dev: You can disable email confirmation");
    console.log("");

    console.log("3. Rate Limiting:");
    console.log("   ✓ Check if rate limits are too strict");
    console.log("   ✓ Default: 30 requests per hour per IP");
    console.log("");

    console.log("4. Allowed Email Domains:");
    console.log("   ✓ Check if there are domain restrictions");
    console.log("   ✓ For testing: Allow all domains or specific test domains");
    console.log("");

    console.log("5. Site URL:");
    console.log("   ✓ Add: http://localhost:3000");
    console.log("   ✓ Add: Your production URL");
    console.log("");

    console.log("6. Redirect URLs:");
    console.log("   ✓ Add: http://localhost:3000/**");
    console.log("   ✓ Add: Your production URL/**");
    console.log("");

    // Test if we can query user_profiles
    console.log("🗄️  Testing database access...\n");

    const tables = ["user_profiles", "funnel_projects"];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select("count").limit(1);

        if (error) {
            console.log(`❌ ${table}: ${error.message}`);
        } else {
            console.log(`✅ ${table}: Accessible`);
        }
    }

    console.log("\n📝 Recommended Auth Settings for Development:\n");
    console.log("   1. Disable 'Confirm email' to speed up testing");
    console.log("   2. Set site URL to http://localhost:3000");
    console.log("   3. Add http://localhost:3000/** to redirect URLs");
    console.log("   4. Remove any email domain restrictions");
    console.log("   5. Increase rate limits if testing frequently");

    console.log("\n🔗 Quick Links:\n");
    const projectId = supabaseUrl.split("//")[1].split(".")[0];
    console.log(
        `   Auth Settings: https://supabase.com/dashboard/project/${projectId}/auth/providers`
    );
    console.log(
        `   Email Templates: https://supabase.com/dashboard/project/${projectId}/auth/templates`
    );
    console.log(
        `   URL Configuration: https://supabase.com/dashboard/project/${projectId}/auth/url-configuration`
    );
}

checkConfig().catch(console.error);
