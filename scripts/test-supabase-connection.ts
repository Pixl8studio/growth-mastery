#!/usr/bin/env tsx
/**
 * Test Supabase Connection
 * Verifies environment variables and basic Supabase connectivity
 */

import { createClient } from "@supabase/supabase-js";

async function testSupabaseConnection() {
    console.log("🔍 Testing Supabase Connection...\n");

    // Step 1: Check environment variables
    console.log("📋 Step 1: Checking environment variables...");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not set");
        process.exit(1);
    }
    if (!supabaseAnonKey) {
        console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
        process.exit(1);
    }

    console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);
    console.log(
        `✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`
    );
    if (serviceRoleKey) {
        console.log(
            `✅ SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey.substring(0, 20)}...`
        );
    }
    console.log("");

    // Step 2: Create Supabase client
    console.log("📋 Step 2: Creating Supabase client...");
    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log("✅ Supabase client created successfully");
        console.log("");

        // Step 3: Test basic connectivity
        console.log("📋 Step 3: Testing basic connectivity...");
        const { data: healthCheck, error: healthError } = await supabase
            .from("user_profiles")
            .select("count")
            .limit(1);

        if (healthError) {
            console.error("❌ Health check failed:", healthError.message);
            console.error("   Details:", healthError);
            console.log("");
        } else {
            console.log("✅ Successfully connected to Supabase database");
            console.log("");
        }

        // Step 4: Test auth service
        console.log("📋 Step 4: Testing auth service...");
        const { data: authData, error: authError } = await supabase.auth.getSession();

        if (authError) {
            console.error("❌ Auth service check failed:", authError.message);
            console.log("");
        } else {
            console.log("✅ Auth service is accessible");
            console.log("   Current session:", authData.session ? "Active" : "None");
            console.log("");
        }

        // Step 5: Test sign up functionality (dry run)
        console.log("📋 Step 5: Testing sign up capability...");
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = "TestPassword123!";

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
        });

        if (signUpError) {
            if (signUpError.message.includes("Email rate limit exceeded")) {
                console.log("⚠️  Rate limit hit (this is OK for testing)");
            } else {
                console.error("❌ Sign up test failed:", signUpError.message);
                console.error("   Code:", signUpError.status);
                console.error("   Details:", signUpError);
            }
        } else {
            console.log("✅ Sign up capability is working");
            console.log("   User ID:", signUpData.user?.id);
            console.log("   Email:", signUpData.user?.email);
            console.log(
                "   Email confirmed:",
                signUpData.user?.email_confirmed_at ? "Yes" : "No"
            );

            // Clean up test user if created
            if (signUpData.user?.id) {
                console.log("🧹 Cleaning up test user...");
                // Note: This would require service role key to delete
                if (serviceRoleKey) {
                    const adminClient = createClient(supabaseUrl, serviceRoleKey);
                    await adminClient.auth.admin.deleteUser(signUpData.user.id);
                    console.log("✅ Test user cleaned up");
                } else {
                    console.log("⚠️  Skipping cleanup (no service role key)");
                }
            }
        }
        console.log("");

        // Step 6: Check if we can list tables (requires proper RLS setup)
        console.log("📋 Step 6: Testing database access...");
        const tables = [
            "user_profiles",
            "funnel_projects",
            "registration_pages",
            "watch_pages",
            "enrollment_pages",
        ];

        for (const table of tables) {
            const { data, error } = await supabase.from(table).select("id").limit(1);

            if (error) {
                if (error.code === "42P01") {
                    console.log(`⚠️  Table "${table}" does not exist`);
                } else if (error.code === "PGRST116") {
                    console.log(`✅ Table "${table}" exists (empty)`);
                } else {
                    console.log(`❌ Table "${table}" error: ${error.message}`);
                }
            } else {
                console.log(
                    `✅ Table "${table}" is accessible (${data?.length || 0} rows)`
                );
            }
        }
        console.log("");

        // Summary
        console.log("🎉 Connection Test Complete!");
        console.log("");
        console.log("Next steps:");
        console.log("1. If all tests passed, your Supabase connection is working");
        console.log(
            "2. If sign up/auth tests failed, check your Supabase Auth settings"
        );
        console.log("3. If table tests failed, ensure your migrations have been run");
        console.log(
            "4. Check Supabase dashboard for any additional configuration needed"
        );
    } catch (error) {
        console.error("❌ Unexpected error:", error);
        process.exit(1);
    }
}

// Load environment variables from .env.local
import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

console.log(`📁 Loading environment from: ${envPath}\n`);

testSupabaseConnection();
