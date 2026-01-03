#!/usr/bin/env tsx
/**
 * Supabase Database Helper
 *
 * Direct database access via Supabase Management API.
 * Used by Claude Code to execute SQL, run migrations, and manage schema.
 *
 * Usage:
 *   pnpm db:query "SELECT * FROM user_profiles LIMIT 5"
 *   pnpm db:tables
 *   pnpm db:schema user_profiles
 *   pnpm db:migrate path/to/migration.sql
 */

import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local
function loadEnv() {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#")) {
                const [key, ...valueParts] = trimmed.split("=");
                const value = valueParts.join("=");
                if (key && value) {
                    process.env[key] = value;
                }
            }
        }
    }
}

loadEnv();

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "lbwawhiemqsqlqbnviou";
const API_BASE = "https://api.supabase.com/v1";

interface QueryResult {
    result?: unknown[];
    error?: string;
}

async function executeSQL(sql: string): Promise<QueryResult> {
    const response = await fetch(
        `${API_BASE}/projects/${SUPABASE_PROJECT_REF}/database/query`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: sql }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        return { error: `API Error (${response.status}): ${errorText}` };
    }

    const data = await response.json();
    return { result: data };
}

async function listTables(): Promise<void> {
    const sql = `
    SELECT
      table_name,
      (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

    const result = await executeSQL(sql);
    if (result.error) {
        console.error("❌ Error:", result.error);
        process.exit(1);
    }

    console.log("\n📊 Tables in public schema:\n");
    console.table(result.result);
}

async function describeTable(tableName: string): Promise<void> {
    const sql = `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableName}'
    ORDER BY ordinal_position;
  `;

    const result = await executeSQL(sql);
    if (result.error) {
        console.error("❌ Error:", result.error);
        process.exit(1);
    }

    console.log(`\n📋 Schema for "${tableName}":\n`);
    console.table(result.result);
}

async function runQuery(sql: string): Promise<void> {
    console.log("\n🔍 Executing SQL:\n");
    console.log(sql);
    console.log("\n---\n");

    const result = await executeSQL(sql);
    if (result.error) {
        console.error("❌ Error:", result.error);
        process.exit(1);
    }

    if (Array.isArray(result.result) && result.result.length > 0) {
        console.table(result.result);
        console.log(`\n✅ ${result.result.length} row(s) returned`);
    } else {
        console.log("✅ Query executed successfully (no rows returned)");
    }
}

async function runMigration(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(filePath, "utf-8");
    console.log(`\n🚀 Running migration: ${filePath}\n`);

    const result = await executeSQL(sql);
    if (result.error) {
        console.error("❌ Migration failed:", result.error);
        process.exit(1);
    }

    console.log("✅ Migration completed successfully");
}

async function getProjectInfo(): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${SUPABASE_PROJECT_REF}`, {
        headers: {
            Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        },
    });

    if (!response.ok) {
        console.error("❌ Failed to fetch project info");
        process.exit(1);
    }

    const project = await response.json();
    console.log("\n🏗️  Project Info:\n");
    console.log(`  Name:     ${project.name}`);
    console.log(`  ID:       ${project.id}`);
    console.log(`  Region:   ${project.region}`);
    console.log(`  Status:   ${project.status}`);
    console.log(`  Database: PostgreSQL ${project.database?.version || "N/A"}`);
    console.log(`  Host:     ${project.database?.host || "N/A"}`);
    console.log("");
}

// Main CLI
async function main() {
    if (!SUPABASE_ACCESS_TOKEN) {
        console.error("❌ SUPABASE_ACCESS_TOKEN not set in .env.local");
        console.error(
            "   Get your token from: https://supabase.com/dashboard/account/tokens"
        );
        process.exit(1);
    }

    const [command, ...args] = process.argv.slice(2);

    switch (command) {
        case "query":
        case "q":
            if (!args[0]) {
                console.error("Usage: pnpm db:query 'SELECT * FROM table'");
                process.exit(1);
            }
            await runQuery(args.join(" "));
            break;

        case "tables":
        case "t":
            await listTables();
            break;

        case "schema":
        case "s":
            if (!args[0]) {
                console.error("Usage: pnpm db:schema table_name");
                process.exit(1);
            }
            await describeTable(args[0]);
            break;

        case "migrate":
        case "m":
            if (!args[0]) {
                console.error("Usage: pnpm db:migrate path/to/migration.sql");
                process.exit(1);
            }
            await runMigration(args[0]);
            break;

        case "info":
        case "i":
            await getProjectInfo();
            break;

        default:
            console.log(`
Supabase Database Helper

Commands:
  query, q <sql>        Execute SQL query
  tables, t             List all tables
  schema, s <table>     Show table schema
  migrate, m <file>     Run migration file
  info, i               Show project info

Examples:
  pnpm db:query "SELECT * FROM user_profiles LIMIT 5"
  pnpm db:tables
  pnpm db:schema funnel_projects
  pnpm db:migrate supabase/migrations/20250101_add_column.sql
  pnpm db:info
`);
    }
}

main().catch((err) => {
    console.error("❌ Unexpected error:", err);
    process.exit(1);
});
