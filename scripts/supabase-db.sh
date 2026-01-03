#!/bin/bash
#
# Supabase Database Helper (Bash version)
# Uses curl for direct API access - fallback when Node fetch fails
#
# Usage:
#   ./scripts/supabase-db.sh query "SELECT * FROM users LIMIT 5"
#   ./scripts/supabase-db.sh tables
#   ./scripts/supabase-db.sh schema user_profiles
#   ./scripts/supabase-db.sh info
#

set -e

# Load environment from .env.local
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Configuration
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-ufndmgxmlceuoapgvfco}"
API_BASE="https://api.supabase.com/v1"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ SUPABASE_ACCESS_TOKEN not set in .env.local"
    echo "   Get your token from: https://supabase.com/dashboard/account/tokens"
    exit 1
fi

# Execute SQL query
execute_sql() {
    local sql="$1"
    curl -s "${API_BASE}/projects/${SUPABASE_PROJECT_REF}/database/query" \
        -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$sql\"}"
}

# Commands
case "$1" in
    query|q)
        shift
        SQL="$*"
        if [ -z "$SQL" ]; then
            echo "Usage: $0 query 'SELECT * FROM table'"
            exit 1
        fi
        echo -e "\n🔍 Executing SQL:\n"
        echo "$SQL"
        echo -e "\n---\n"
        execute_sql "$SQL" | jq '.'
        ;;

    tables|t)
        SQL="SELECT table_name, (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count FROM information_schema.tables t WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
        echo -e "\n📊 Tables in public schema:\n"
        execute_sql "$SQL" | jq -r '.[] | "\(.table_name)\t\(.column_count) columns"' | column -t
        ;;

    schema|s)
        TABLE="$2"
        if [ -z "$TABLE" ]; then
            echo "Usage: $0 schema table_name"
            exit 1
        fi
        SQL="SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$TABLE' ORDER BY ordinal_position"
        echo -e "\n📋 Schema for \"$TABLE\":\n"
        execute_sql "$SQL" | jq -r '.[] | "\(.column_name)\t\(.data_type)\t\(.is_nullable)\t\(.column_default // "null")"' | column -t -s $'\t'
        ;;

    info|i)
        echo -e "\n🏗️  Project Info:\n"
        curl -s "${API_BASE}/projects/${SUPABASE_PROJECT_REF}" \
            -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" | \
            jq -r '"  Name:     \(.name)\n  ID:       \(.id)\n  Region:   \(.region)\n  Status:   \(.status)\n  Database: PostgreSQL \(.database.version)\n  Host:     \(.database.host)"'
        echo ""
        ;;

    migrate|m)
        FILE="$2"
        if [ -z "$FILE" ]; then
            echo "Usage: $0 migrate path/to/migration.sql"
            exit 1
        fi
        if [ ! -f "$FILE" ]; then
            echo "❌ File not found: $FILE"
            exit 1
        fi
        SQL=$(cat "$FILE")
        echo -e "\n🚀 Running migration: $FILE\n"
        RESULT=$(execute_sql "$SQL")
        if echo "$RESULT" | grep -q "error"; then
            echo "❌ Migration failed:"
            echo "$RESULT" | jq '.'
            exit 1
        fi
        echo "✅ Migration completed successfully"
        ;;

    *)
        echo "
Supabase Database Helper (Bash)

Commands:
  query, q <sql>        Execute SQL query
  tables, t             List all tables
  schema, s <table>     Show table schema
  migrate, m <file>     Run migration file
  info, i               Show project info

Examples:
  $0 query \"SELECT * FROM user_profiles LIMIT 5\"
  $0 tables
  $0 schema funnel_projects
  $0 migrate supabase/migrations/20250101_add_column.sql
  $0 info
"
        ;;
esac
