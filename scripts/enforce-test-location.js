#!/usr/bin/env node

 

/**
 * Enforce that ALL tests must live in __tests__/ directory
 * Fails if any test files are found outside __tests__/
 */

const { execSync } = require("child_process");
const path = require("path");

const ALLOWED_TEST_DIR = "__tests__";
const EXCLUDED_DIRS = [
  "node_modules",
  ".next",
  "dist",
  "build",
  ".gitworktrees",
  ".swarm",
  "coverage",
];

function findTestsOutsideAllowedDir() {
  console.log("🔍 Checking for tests outside __tests__/ directory...\n");

  // Build find command to search for test files excluding certain directories
  const excludeArgs = EXCLUDED_DIRS.map((dir) => `-path "*/${dir}/*" -prune -o`).join(" ");

  try {
    const result = execSync(
      `find . ${excludeArgs} \\( -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" \\) -type f -print | grep -v "^./${ALLOWED_TEST_DIR}/"`,
      {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    ).trim();

    if (!result) {
      return [];
    }

    return result.split("\n").filter(Boolean);
  } catch (error) {
    // grep returns exit code 1 when no matches found, which is what we want
    if (error.status === 1) {
      return [];
    }
    throw error;
  }
}

function main() {
  const violations = findTestsOutsideAllowedDir();

  if (violations.length === 0) {
    console.log("✅ All tests are in __tests__/ directory");
    console.log(`✅ Test location enforcement: PASSED\n`);
    process.exit(0);
  }

  console.error(`❌ Found ${violations.length} test file(s) outside __tests__/ directory:\n`);

  violations.forEach((file) => {
    console.error(`  ${file}`);
  });

  console.error("\n⚠️  POLICY VIOLATION:");
  console.error("  All test files MUST be located in the __tests__/ directory.");
  console.error("  This ensures consistent test organization and prevents tests");
  console.error("  from being scattered across the codebase.\n");

  console.error("📝 How to fix:");
  console.error("  1. Move the test files to __tests__/ following this structure:");
  console.error("     - Unit tests: __tests__/unit/<module-path>");
  console.error("     - Integration tests: __tests__/integration/<feature>");
  console.error("     - E2E tests: __tests__/e2e/<user-flow>");
  console.error("");
  console.error("  2. Update imports in the test files if needed");
  console.error("  3. Run tests to ensure they still pass\n");

  console.error("📚 See docs/test-consolidation-plan.md for more details\n");

  process.exit(1);
}

main();
