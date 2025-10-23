#!/usr/bin/env tsx
/**
 * Supabase Configuration Validator
 *
 * Validates:
 * - Environment variables are set correctly
 * - Database types exist and are up-to-date
 * - Supabase connection can be established (if credentials provided)
 *
 * This is the Supabase equivalent of `prisma validate`
 */

import { existsSync, statSync } from "fs";
import { resolve } from "path";

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validates required and optional Supabase environment variables
 * @returns ValidationResult with warnings for missing variables
 */
export function validateEnvVariables(): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    // Check for Supabase environment variables
    const requiredVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

    const optionalVars = ["SUPABASE_SERVICE_ROLE_KEY"];

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            result.warnings.push(
                `⚠️  ${varName} is not set (okay for CI/CD, required for local dev)`
            );
        }
    }

    for (const varName of optionalVars) {
        if (!process.env[varName]) {
            result.warnings.push(
                `ℹ️  ${varName} is not set (optional, only needed for admin operations)`
            );
        }
    }

    return result;
}

/**
 * Validates that database types file exists and is reasonably up-to-date
 * @returns ValidationResult with errors if types don't exist, warnings if stale
 */
export function validateDatabaseTypes(): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    const typesPath = resolve(process.cwd(), "types/database.ts");

    if (!existsSync(typesPath)) {
        result.errors.push(
            "❌ types/database.ts not found. Run 'pnpm db:types' to generate types."
        );
        result.valid = false;
        return result;
    }

    // Check if types file is recent (within last 30 days)
    const stats = statSync(typesPath);
    const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);

    if (ageInDays > 30) {
        result.warnings.push(
            `⚠️  types/database.ts is ${Math.floor(ageInDays)} days old. Consider regenerating with 'pnpm db:types'.`
        );
    }

    return result;
}

/**
 * Validates Supabase directory structure (migrations, config)
 * @returns ValidationResult with info about found directories
 */
export function validateSupabaseDirectory(): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    const supabasePath = resolve(process.cwd(), "supabase");

    if (!existsSync(supabasePath)) {
        result.warnings.push(
            "ℹ️  supabase/ directory not found. This is okay if you're using remote Supabase only."
        );
        return result;
    }

    // Check for migrations directory
    const migrationsPath = resolve(supabasePath, "migrations");
    if (existsSync(migrationsPath)) {
        result.warnings.push(
            `✅ Found supabase/migrations/ directory with local migrations.`
        );
    }

    // Check for config.toml
    const configPath = resolve(supabasePath, "config.toml");
    if (existsSync(configPath)) {
        result.warnings.push(`✅ Found supabase/config.toml configuration.`);
    }

    return result;
}

/**
 * Validates Supabase connection by attempting a simple query
 * @returns ValidationResult with connection status
 */
export async function validateSupabaseConnection(): Promise<ValidationResult> {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        result.warnings.push(
            "ℹ️  Skipping connection test (credentials not provided)."
        );
        return result;
    }

    try {
        // Dynamic import to avoid issues if @supabase/supabase-js is not installed
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(url, key);

        // Try a simple query to test connection
        const { error } = await supabase.from("_test_").select("*").limit(1);

        // PGRST116 is PostgREST's "relation does not exist" error code
        // This is expected and means the connection works, just the table doesn't exist
        // 404/406 errors also indicate successful connection but missing table
        if (error && error.code !== "PGRST116" && !error.message.includes("404")) {
            result.warnings.push(
                `⚠️  Could not verify Supabase connection: ${error.message}`
            );
        } else {
            result.warnings.push("✅ Supabase connection verified successfully.");
        }
    } catch (error) {
        result.warnings.push(
            `⚠️  Could not test Supabase connection: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    return result;
}

/**
 * Runs all validations and returns aggregated results
 * @returns Promise<ValidationResult> with all validation results combined
 */
export async function runAllValidations(): Promise<ValidationResult> {
    const results = [
        validateEnvVariables(),
        validateDatabaseTypes(),
        validateSupabaseDirectory(),
        await validateSupabaseConnection(),
    ];

    // Aggregate all results
    const aggregated: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
    };

    for (const result of results) {
        if (!result.valid) {
            aggregated.valid = false;
        }
        aggregated.errors.push(...result.errors);
        aggregated.warnings.push(...result.warnings);
    }

    return aggregated;
}

/**
 * Main entry point when run as a script
 * Separated from validation logic for testability
 */
async function main() {
    console.log("🔍 Validating Supabase configuration...\n");

    const result = await runAllValidations();

    // Output errors
    if (result.errors.length > 0) {
        result.errors.forEach((error) => console.error(error));
    }

    // Output warnings
    if (result.warnings.length > 0) {
        result.warnings.forEach((warning) => console.log(warning));
    }

    console.log("");

    // Summary counts
    if (result.errors.length > 0 || result.warnings.length > 0) {
        console.log(
            `📊 Summary: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`
        );
        console.log("");
    }

    // Exit with appropriate code
    if (!result.valid) {
        console.error("❌ Supabase validation failed with errors.");
        return 1;
    }

    if (result.warnings.length > 0) {
        console.log("✅ Supabase validation passed (with warnings).");
    } else {
        console.log("✅ Supabase validation passed!");
    }

    return 0;
}

// Only run main if this file is executed directly
if (require.main === module) {
    main()
        .then((exitCode) => process.exit(exitCode))
        .catch((error) => {
            console.error("❌ Unexpected error during validation:", error);
            process.exit(1);
        });
}
