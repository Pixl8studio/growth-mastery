#!/usr/bin/env tsx
/**
 * Supabase Migration Validator
 *
 * Validates:
 * - Migration files exist and are well-formed
 * - Migration files follow naming conventions
 * - SQL syntax is valid using proper SQL parsing
 *
 * This is the Supabase equivalent of checking Prisma schema format
 */

import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { Parser } from "node-sql-parser";

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

// Initialize SQL parser for PostgreSQL
const sqlParser = new Parser();

/**
 * Validates SQL syntax using proper SQL parsing
 *
 * Note: The node-sql-parser library supports standard SQL but may not understand
 * all PostgreSQL-specific features. The following are automatically skipped:
 * - Transaction control (BEGIN, COMMIT, ROLLBACK)
 * - Row Level Security (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
 * - Policies (CREATE/DROP POLICY)
 * - Functions (CREATE FUNCTION, CREATE OR REPLACE FUNCTION)
 * - Triggers (CREATE/DROP TRIGGER)
 * - Search path configuration (SET search_path)
 *
 * @param content - The SQL content to validate
 * @param filename - The filename for error reporting
 * @returns ValidationResult with warnings for syntax issues
 */
export function validateSQLSyntax(content: string, filename: string): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    // Remove comments before parsing to avoid parser issues
    const contentWithoutComments = content
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .replace(/\/\*[\s\S]*?\*\//g, "");

    // Split content into individual statements
    const statements = contentWithoutComments
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    if (statements.length === 0) {
        return result;
    }

    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];

        // Skip transaction control statements (not supported by parser)
        const lowerStatement = statement.toLowerCase().trim();
        if (
            lowerStatement === "begin" ||
            lowerStatement === "commit" ||
            lowerStatement === "rollback" ||
            lowerStatement.startsWith("begin;") ||
            lowerStatement.startsWith("commit;") ||
            lowerStatement.startsWith("rollback;")
        ) {
            continue;
        }

        // Skip PostgreSQL-specific statements that the parser might not understand
        if (
            lowerStatement.startsWith("alter table") &&
            lowerStatement.includes("enable row level security")
        ) {
            continue;
        }

        if (
            lowerStatement.startsWith("create policy") ||
            lowerStatement.startsWith("drop policy")
        ) {
            continue;
        }

        if (
            lowerStatement.startsWith("create function") ||
            lowerStatement.startsWith("create or replace function")
        ) {
            continue;
        }

        if (
            lowerStatement.startsWith("create trigger") ||
            lowerStatement.startsWith("drop trigger")
        ) {
            continue;
        }

        if (lowerStatement.includes("set search_path")) {
            continue;
        }

        // Try to parse the statement
        try {
            sqlParser.astify(statement, { database: "postgresql" });
        } catch (error) {
            // Only report as warning since some PostgreSQL features aren't supported
            result.warnings.push(
                `⚠️  ${filename}: Statement ${i + 1} has potential syntax issues - ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    return result;
}

/**
 * Checks for dangerous SQL operations that could cause data loss
 *
 * Dangerous operations (will cause validation failure):
 * - DROP DATABASE (without IF EXISTS)
 * - DROP SCHEMA (without IF EXISTS)
 *
 * Potentially destructive operations (will warn):
 * - TRUNCATE TABLE
 * - DELETE FROM
 * - DROP TABLE
 * - ALTER TABLE ... DROP COLUMN
 *
 * @param content - The SQL content to check
 * @param filename - The filename for error reporting
 * @returns ValidationResult with errors for dangerous operations
 */
export function checkForDangerousOperations(
    content: string,
    filename: string
): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };
    const lowercaseContent = content.toLowerCase();

    // Check for dangerous operations
    const dangerousPatterns = [
        {
            pattern: "drop database",
            message: "Contains 'DROP DATABASE' - extremely dangerous!",
        },
        {
            pattern: "drop schema",
            message: "Contains 'DROP SCHEMA' - potentially dangerous!",
        },
    ];

    for (const { pattern, message } of dangerousPatterns) {
        if (lowercaseContent.includes(pattern)) {
            // Check if it's part of a safe IF EXISTS statement
            const regex = new RegExp(
                `drop\\s+${pattern.split(" ")[1]}\\s+if\\s+exists`,
                "i"
            );
            if (!regex.test(lowercaseContent)) {
                result.errors.push(`❌ ${filename}: ${message}`);
                result.valid = false;
            }
        }
    }

    // Warn about potentially destructive operations
    const warningPatterns = [
        "truncate table",
        "delete from",
        "drop table",
        "alter table.*drop column",
    ];

    for (const pattern of warningPatterns) {
        const regex = new RegExp(pattern, "i");
        if (regex.test(lowercaseContent)) {
            result.warnings.push(
                `⚠️  ${filename}: Contains potentially destructive operation: ${pattern.toUpperCase()}`
            );
        }
    }

    return result;
}

/**
 * Validates all migration files in the supabase/migrations directory
 * Checks naming conventions, empty files, transactions, and SQL syntax
 *
 * @returns ValidationResult with all migration file validation results
 */
export function validateMigrationFiles(): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    const migrationsPath = resolve(process.cwd(), "supabase/migrations");

    if (!existsSync(migrationsPath)) {
        result.warnings.push(
            "ℹ️  No supabase/migrations/ directory found. This is okay if you're managing migrations remotely."
        );
        return result;
    }

    const files = readdirSync(migrationsPath).filter((f) => f.endsWith(".sql"));

    if (files.length === 0) {
        result.warnings.push(
            "ℹ️  No migration files found in supabase/migrations/. This is okay for new projects."
        );
        return result;
    }

    console.log(`📋 Found ${files.length} migration file(s):\n`);

    for (const file of files) {
        const filePath = resolve(migrationsPath, file);

        // Check naming convention (timestamp_description.sql)
        const namePattern = /^\d{14,20}_[\w-]+\.sql$/;
        if (!namePattern.test(file)) {
            result.warnings.push(
                `⚠️  ${file}: Doesn't follow naming convention (YYYYMMDDHHMMSS_description.sql)`
            );
        }

        // Read and validate SQL
        try {
            const content = readFileSync(filePath, "utf-8");

            // Basic SQL validation
            if (content.trim().length === 0) {
                result.errors.push(`❌ ${file}: File is empty`);
                result.valid = false;
                continue;
            }

            // Check for common SQL syntax issues
            const lowercaseContent = content.toLowerCase();

            // Warn about missing transactions (best practice)
            if (
                !lowercaseContent.includes("begin") &&
                !lowercaseContent.includes("commit")
            ) {
                result.warnings.push(
                    `⚠️  ${file}: Consider wrapping in transaction (BEGIN/COMMIT)`
                );
            }

            // Check for dangerous operations
            const dangerousCheck = checkForDangerousOperations(content, file);
            result.errors.push(...dangerousCheck.errors);
            result.warnings.push(...dangerousCheck.warnings);
            if (!dangerousCheck.valid) {
                result.valid = false;
            }

            // Validate SQL syntax with proper parser
            const syntaxCheck = validateSQLSyntax(content, file);
            result.warnings.push(...syntaxCheck.warnings);

            // Report validation status
            if (
                dangerousCheck.errors.length === 0 &&
                syntaxCheck.warnings.length === 0
            ) {
                console.log(`   ✅ ${file} - Valid`);
            } else if (dangerousCheck.errors.length > 0) {
                console.log(`   ❌ ${file} - Errors found`);
            } else {
                console.log(`   ⚠️  ${file} - Valid with warnings`);
            }
        } catch (error) {
            result.errors.push(
                `❌ ${file}: Could not read file - ${error instanceof Error ? error.message : String(error)}`
            );
            result.valid = false;
        }
    }

    return result;
}

/**
 * Validates that migration timestamps are unique (no duplicates)
 * Duplicate timestamps can cause migration ordering issues
 *
 * @returns ValidationResult with errors for duplicate timestamps
 */
export function validateMigrationOrder(): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };

    const migrationsPath = resolve(process.cwd(), "supabase/migrations");

    if (!existsSync(migrationsPath)) {
        return result;
    }

    const files = readdirSync(migrationsPath)
        .filter((f) => f.endsWith(".sql"))
        .sort();

    const timestamps = files
        .map((f) => {
            const match = f.match(/^(\d{14,20})_/);
            return match ? match[1] : null;
        })
        .filter((t): t is string => t !== null);

    // Check for duplicate timestamps
    const duplicates = timestamps.filter((t, i) => timestamps.indexOf(t) !== i);

    if (duplicates.length > 0) {
        result.errors.push(
            `❌ Duplicate migration timestamps found: ${duplicates.join(", ")}`
        );
        result.valid = false;
    }

    return result;
}

/**
 * Runs all migration validations and returns aggregated results
 * @returns ValidationResult with all validation results combined
 */
export function runAllValidations(): ValidationResult {
    const results = [validateMigrationFiles(), validateMigrationOrder()];

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
    console.log("🔍 Validating Supabase migrations...\n");

    const result = runAllValidations();

    // Output errors
    if (result.errors.length > 0) {
        console.log("");
        result.errors.forEach((error) => console.error(error));
    }

    // Output warnings
    if (result.warnings.length > 0) {
        console.log("");
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
        console.error("❌ Migration validation failed with errors.");
        return 1;
    }

    if (result.warnings.length > 0) {
        console.log("✅ Migration validation passed (with warnings).");
    } else {
        console.log("✅ Migration validation passed!");
    }

    return 0;
}

// Only run main if this file is executed directly
if (require.main === module) {
    main()
        .then((exitCode) => process.exit(exitCode))
        .catch((error) => {
            console.error("❌ Unexpected error during migration check:", error);
            process.exit(1);
        });
}
