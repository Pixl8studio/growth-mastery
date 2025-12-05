#!/usr/bin/env node

/**
 * Pre-test validation script to prevent dangerous process spawning patterns
 * Run this before tests to catch issues early
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DANGEROUS_PATTERNS = [
  {
    pattern: /require\(['"]child_process['"]\)/g,
    message: "Direct require of child_process detected - must be mocked",
  },
  {
    pattern: /import.*from ['"]child_process['"]/g,
    message: "Direct import of child_process detected - must be mocked",
  },
  {
    pattern: /require\(['"]worker_threads['"]\)/g,
    message: "Direct require of worker_threads detected - must be mocked",
  },
  {
    pattern: /import.*from ['"]worker_threads['"]/g,
    message: "Direct import of worker_threads detected - must be mocked",
  },
  {
    pattern: /\.spawn\(/g,
    message: "Potential spawn call detected - ensure it's mocked",
  },
  {
    pattern: /\.exec\(/g,
    message: "Potential exec call detected - ensure it's mocked",
  },
  {
    pattern: /\.fork\(/g,
    message: "Potential fork call detected - ensure it's mocked",
  },
  {
    pattern: /new Worker\(/g,
    message: "Worker thread creation detected - ensure it's mocked",
  },
];

const ALLOWED_FILES = ["__tests__/setup.ts", "scripts/validate-test-safety.js"];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(process.cwd(), filePath);

  // Skip allowed files
  if (ALLOWED_FILES.some((allowed) => relativePath.includes(allowed))) {
    return [];
  }

  const violations = [];

  for (const { pattern, message } of DANGEROUS_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      violations.push({
        file: relativePath,
        pattern: pattern.toString(),
        message,
        occurrences: matches.length,
      });
    }
  }

  return violations;
}

function findTestFiles() {
  const testDirs = ["__tests__"];
  const testFiles = [];

  for (const dir of testDirs) {
    if (!fs.existsSync(dir)) continue;

    // Exclude .gitworktrees and other non-main-repo directories
    const files = execSync(
      `find ${dir} -type f \\( -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" \\) ! -path "*/.gitworktrees/*" ! -path "*/node_modules/*"`,
      {
        encoding: "utf8",
      }
    )
      .trim()
      .split("\n")
      .filter(Boolean);

    testFiles.push(...files);
  }

  return testFiles;
}

function main() {
  console.log("🔍 Scanning test files for dangerous process spawning patterns...\n");

  const testFiles = findTestFiles();
  console.log(`Found ${testFiles.length} test files to scan\n`);

  let totalViolations = 0;
  const allViolations = [];

  for (const file of testFiles) {
    const violations = scanFile(file);
    if (violations.length > 0) {
      allViolations.push(...violations);
      totalViolations += violations.length;
    }
  }

  if (totalViolations === 0) {
    console.log("✅ No dangerous patterns detected!");
    console.log("🛡️  All tests are safe from process spawning issues");
    process.exit(0);
  } else {
    console.error(`❌ Found ${totalViolations} potential violations:\n`);

    for (const violation of allViolations) {
      console.error(`File: ${violation.file}`);
      console.error(`  Pattern: ${violation.pattern}`);
      console.error(`  Issue: ${violation.message}`);
      console.error(`  Occurrences: ${violation.occurrences}\n`);
    }

    console.error("\n⚠️  CRITICAL: These patterns can cause cascading process spawning!");
    console.error("Please ensure all process spawning is properly mocked in tests.");
    console.error("See __tests__/setup.ts for proper mocking patterns.\n");

    process.exit(1);
  }
}

main();
