#!/usr/bin/env tsx
/**
 * Test Supabase Authentication with Real Email
 * Tests sign up with a real email address you provide
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import * as readline from "readline";

// Load environment variables
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function testAuth() {
    console.log("🔐 Supabase Authentication Test\n");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error("❌ Missing Supabase environment variables");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log("Choose an option:");
    console.log("1. Test Sign Up (create new account)");
    console.log("2. Test Sign In (login with existing account)");
    console.log("3. Exit");
    console.log("");

    const choice = await question("Enter your choice (1-3): ");

    if (choice === "3") {
        console.log("Goodbye! 👋");
        rl.close();
        return;
    }

    const email = await question("Enter email address: ");
    const password = await question("Enter password: ");

    console.log("");

    if (choice === "1") {
        console.log("🔄 Attempting to sign up...");
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            console.error("❌ Sign up failed:", error.message);
            console.error("   Code:", error.status);
            console.error("   Details:", error);
        } else {
            console.log("✅ Sign up successful!");
            console.log("   User ID:", data.user?.id);
            console.log("   Email:", data.user?.email);
            console.log(
                "   Email confirmed:",
                data.user?.email_confirmed_at ? "Yes" : "No"
            );
            console.log(
                "   Session:",
                data.session ? "Created" : "Not created (check email)"
            );

            if (!data.session) {
                console.log("\n⚠️  No session created. This usually means:");
                console.log("   - Email confirmation is required");
                console.log("   - Check your email for a confirmation link");
                console.log(
                    "   - Or check Supabase Auth settings to allow auto-confirm"
                );
            }
        }
    } else if (choice === "2") {
        console.log("🔄 Attempting to sign in...");
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error("❌ Sign in failed:", error.message);
            console.error("   Code:", error.status);

            if (error.message.includes("Invalid login credentials")) {
                console.log("\n💡 Common reasons for this error:");
                console.log("   - Email or password is incorrect");
                console.log("   - Email hasn't been confirmed yet");
                console.log("   - User doesn't exist");
            }
        } else {
            console.log("✅ Sign in successful!");
            console.log("   User ID:", data.user?.id);
            console.log("   Email:", data.user?.email);
            console.log("   Session:", data.session?.access_token ? "Active" : "None");
            console.log("   Expires at:", data.session?.expires_at);
        }
    } else {
        console.log("Invalid choice");
    }

    rl.close();
}

testAuth().catch(console.error);
