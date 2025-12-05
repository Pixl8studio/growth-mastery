#!/usr/bin/env node

/**
 * Agent Frontmatter Validation Script
 *
 * Validates that all agent files comply with ai-coding-config standards
 * defined in .cursor/rules/ai/agent-file-format.mdc
 *
 * Usage:
 *   node scripts/validate-agents.js .claude/agents/*.md
 *   node scripts/validate-agents.js .claude/agents/specific-agent.md
 */

const fs = require("fs");
const path = require("path");

// Valid tool names whitelist
const VALID_TOOLS = [
  "Read",
  "Write",
  "Edit",
  "Grep",
  "Glob",
  "Bash",
  "TodoWrite",
  "Task",
  "WebFetch",
  "WebSearch",
  "BashOutput",
  "KillShell",
  "AskUserQuestion",
  "Skill",
  "SlashCommand",
  "EnterPlanMode",
  "ExitPlanMode",
  "NotebookEdit",
  // Playwright MCP tools
  "mcp__playwright__browser_snapshot",
  "mcp__playwright__browser_click",
  "mcp__playwright__browser_navigate",
  "mcp__playwright__browser_take_screenshot",
  "mcp__playwright__browser_evaluate",
  "mcp__playwright__browser_type",
  "mcp__playwright__browser_fill_form",
  "mcp__playwright__browser_close",
  "mcp__playwright__browser_resize",
  "mcp__playwright__browser_console_messages",
  "mcp__playwright__browser_handle_dialog",
  "mcp__playwright__browser_file_upload",
  "mcp__playwright__browser_install",
  "mcp__playwright__browser_press_key",
  "mcp__playwright__browser_navigate_back",
  "mcp__playwright__browser_network_requests",
  "mcp__playwright__browser_run_code",
  "mcp__playwright__browser_select_option",
  "mcp__playwright__browser_tabs",
  "mcp__playwright__browser_wait_for",
  "mcp__playwright__browser_drag",
  "mcp__playwright__browser_hover",
];

// Valid model values
const VALID_MODELS = ["sonnet", "haiku", "opus"];

// Parse YAML frontmatter from markdown file
function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatterText = frontmatterMatch[1];
  const data = {};

  // Simple YAML parser (handles our agent frontmatter format)
  const lines = frontmatterText.split("\n");
  let currentKey = null;
  let currentValue = "";
  let inMultiline = false;

  for (const line of lines) {
    // Check for key-value pairs
    const keyMatch = line.match(/^(\w+):\s*(.*)$/);

    if (keyMatch && !inMultiline) {
      // Save previous key if exists
      if (currentKey) {
        data[currentKey] = currentValue.trim();
      }

      currentKey = keyMatch[1];
      currentValue = keyMatch[2];

      // Check if starting multiline string
      if (currentValue === ">" || currentValue === "|" || currentValue === '""') {
        inMultiline = true;
        currentValue = "";
      } else if (currentValue.startsWith('"') && currentValue.endsWith('"')) {
        // Single-line quoted string
        currentValue = currentValue.slice(1, -1);
        data[currentKey] = currentValue;
        currentKey = null;
        currentValue = "";
      } else if (currentValue) {
        // Single-line value
        data[currentKey] = currentValue;
        currentKey = null;
        currentValue = "";
      }
    } else if (inMultiline && currentKey) {
      // Continuation of multiline value
      const trimmed = line.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        // End of multiline
        currentValue += " " + trimmed.slice(1, -1);
        data[currentKey] = currentValue.trim();
        currentKey = null;
        currentValue = "";
        inMultiline = false;
      } else if (trimmed) {
        currentValue += " " + trimmed;
      }
    }
  }

  // Save last key if exists
  if (currentKey) {
    data[currentKey] = currentValue.trim();
  }

  // Parse tools array
  if (data.tools && typeof data.tools === "string") {
    data.tools = data.tools.split(",").map((t) => t.trim());
  }

  return data;
}

// Validate agent file
function validateAgent(filepath) {
  const errors = [];
  const warnings = [];

  try {
    const content = fs.readFileSync(filepath, "utf8");
    const data = parseFrontmatter(content);

    if (!data) {
      errors.push("Missing or invalid frontmatter");
      return { errors, warnings };
    }

    // Required field: name
    if (!data.name) {
      errors.push("Missing required field 'name' in frontmatter");
    } else if (typeof data.name !== "string" || data.name.trim() === "") {
      errors.push("Field 'name' must be a non-empty string");
    }

    // Required field: description
    if (!data.description) {
      errors.push("Missing required field 'description' in frontmatter");
    } else {
      // Validate description quality
      const desc = data.description;

      if (desc.length < 50) {
        warnings.push(
          `Description is too short (${desc.length} chars, recommend 50-500)`
        );
      }

      if (desc.length > 500) {
        warnings.push(
          `Description is too long (${desc.length} chars, recommend 50-500)`
        );
      }

      if (!desc.toLowerCase().includes("invoke")) {
        warnings.push(
          `Description should include 'Invoke' or 'invoke' to clarify when Claude should activate this agent`
        );
      }
    }

    // Required field: tools
    if (!data.tools) {
      errors.push("Missing required field 'tools' in frontmatter");
    } else {
      // Validate tools
      if (!Array.isArray(data.tools)) {
        errors.push("Field 'tools' must be an array");
      } else {
        // Check each tool against whitelist
        const invalidTools = data.tools.filter((tool) => !VALID_TOOLS.includes(tool));
        if (invalidTools.length > 0) {
          warnings.push(
            `Unknown tools (may be valid, verify): ${invalidTools.join(", ")}`
          );
        }

        if (data.tools.length === 0) {
          warnings.push("Tools array is empty - agent has no capabilities");
        }
      }
    }

    // Required field: model
    if (!data.model) {
      errors.push(
        "Missing required field 'model' in frontmatter\n" +
          "    Fix: Add one of: model: sonnet | haiku | opus\n" +
          "    Recommendation: Use 'sonnet' for complex tasks, 'haiku' for simple tasks"
      );
    } else if (!VALID_MODELS.includes(data.model)) {
      errors.push(
        `Invalid model '${data.model}'. Must be one of: ${VALID_MODELS.join(", ")}`
      );
    }

    // Check for consistent structure (warn about XML tags)
    if (content.includes("<identity>") || content.includes("<approach>")) {
      warnings.push(
        "Uses XML-style tags (<identity>, <approach>). Consider converting to markdown headings for consistency with other agents"
      );
    }
  } catch (error) {
    errors.push(`Failed to read or parse file: ${error.message}`);
  }

  return { errors, warnings };
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: node validate-agents.js <agent-file-1.md> [agent-file-2.md...]");
    process.exit(1);
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  const results = [];

  for (const filepath of args) {
    if (!fs.existsSync(filepath)) {
      console.error(`❌ File not found: ${filepath}`);
      totalErrors++;
      continue;
    }

    const filename = path.basename(filepath);
    const { errors, warnings } = validateAgent(filepath);

    if (errors.length > 0 || warnings.length > 0) {
      results.push({ filename, filepath, errors, warnings });
      totalErrors += errors.length;
      totalWarnings += warnings.length;
    }
  }

  // Print results
  if (results.length === 0) {
    console.log("✅ All agent files are valid!");
    process.exit(0);
  }

  console.log("\n🤖 Agent Validation Results\n");

  for (const { filename, filepath, errors, warnings } of results) {
    if (errors.length > 0) {
      console.log(`❌ ${filename}:`);
      for (const error of errors) {
        console.log(`   ${error}`);
      }
      console.log();
    }

    if (warnings.length > 0) {
      console.log(`⚠️  ${filename}:`);
      for (const warning of warnings) {
        console.log(`   ${warning}`);
      }
      console.log();
    }
  }

  // Summary
  console.log("═".repeat(60));
  console.log(`Total: ${totalErrors} error(s), ${totalWarnings} warning(s)`);
  console.log("═".repeat(60));

  if (totalErrors > 0) {
    console.log("\n❌ Validation failed. Fix errors above and try again.");
    process.exit(1);
  } else {
    console.log("\n✅ Validation passed (with warnings)");
    process.exit(0);
  }
}

main();
