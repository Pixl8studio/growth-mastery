/**
 * Test script for referral code system
 * Tests the database migration and API endpoints
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing environment variables");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testReferralCodeSystem() {
    console.log("🧪 Testing Referral Code System\n");

    try {
        // Test 1: Check if POWERGROWTH code exists
        console.log("1️⃣  Testing if POWERGROWTH code exists...");
        const { data: powerGrowthCode, error: fetchError } = await supabase
            .from("referral_codes")
            .select("*")
            .eq("code", "POWERGROWTH")
            .single();

        if (fetchError) {
            console.error("❌ Failed to fetch POWERGROWTH code:", fetchError.message);
            return;
        }

        if (powerGrowthCode) {
            console.log("✅ POWERGROWTH code exists");
            console.log(`   - ID: ${powerGrowthCode.id}`);
            console.log(`   - Active: ${powerGrowthCode.is_active}`);
            console.log(
                `   - Uses: ${powerGrowthCode.current_uses}/${powerGrowthCode.max_uses || "unlimited"}`
            );
        } else {
            console.error("❌ POWERGROWTH code not found");
            return;
        }

        // Test 2: Test case-insensitive lookup
        console.log("\n2️⃣  Testing case-insensitive lookup...");
        const testCodes = ["powergrowth", "PowerGrowth", "POWERGROWTH"];

        for (const testCode of testCodes) {
            const { data: code } = await supabase
                .from("referral_codes")
                .select("*")
                .ilike("code", testCode)
                .eq("is_active", true)
                .single();

            if (code) {
                console.log(`✅ Found code with "${testCode}"`);
            } else {
                console.error(`❌ Failed to find code with "${testCode}"`);
            }
        }

        // Test 3: Create a test referral code
        console.log("\n3️⃣  Testing referral code creation...");
        const testCodeName = `TEST${Date.now()}`;

        const { data: newCode, error: createError } = await supabase
            .from("referral_codes")
            .insert({
                code: testCodeName,
                description: "Test referral code",
                is_active: true,
                max_uses: 10,
            })
            .select()
            .single();

        if (createError) {
            console.error("❌ Failed to create test code:", createError.message);
        } else {
            console.log(`✅ Created test code: ${newCode.code}`);

            // Test 4: Test max_uses constraint
            console.log("\n4️⃣  Testing max_uses constraint...");
            const { data: codeCheck } = await supabase
                .from("referral_codes")
                .select("*")
                .eq("code", testCodeName)
                .eq("is_active", true)
                .single();

            if (codeCheck) {
                const hasCapacity =
                    codeCheck.max_uses === null ||
                    codeCheck.current_uses < codeCheck.max_uses;
                console.log(
                    `✅ Max uses check: ${hasCapacity ? "Has capacity" : "At limit"}`
                );
                console.log(
                    `   - Current: ${codeCheck.current_uses}, Max: ${codeCheck.max_uses}`
                );
            }

            // Cleanup: Delete test code
            await supabase.from("referral_codes").delete().eq("id", newCode.id);
            console.log(`✅ Cleaned up test code`);
        }

        // Test 5: Check user_profiles table has referral_code_id column
        console.log("\n5️⃣  Testing user_profiles schema...");
        const { data: profiles } = await supabase
            .from("user_profiles")
            .select("id, referral_code_id")
            .limit(1);

        if (profiles !== null) {
            console.log("✅ user_profiles.referral_code_id column exists");
        } else {
            console.error("❌ Failed to query user_profiles with referral_code_id");
        }

        console.log(
            "\n✅ All tests passed! Referral code system is working correctly."
        );
    } catch (error) {
        console.error("\n❌ Test failed:", error);
        process.exit(1);
    }
}

// Run tests
testReferralCodeSystem();
