/**
 * API-Based Agent Executor
 *
 * Executes tasks using Claude API instead of Claude Code CLI.
 * Loads the complete ai-coding-config environment into context.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

interface TaskRequest {
    task_id: string;
    prompt: string;
    branch: string;
    base_branch: string;
    repo?: string;
}

interface TaskResult {
    success: boolean;
    error?: string;
    pr_number?: number;
    pr_url?: string;
    duration_ms: number;
}

interface Tool {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
    };
}

/**
 * Loads all .cursor/rules files into context
 */
function loadCursorRules(workspacePath: string): string {
    const rulesPath = path.join(workspacePath, ".cursor", "rules");
    if (!fs.existsSync(rulesPath)) return "";

    let rulesContent = "\n# Project Coding Standards and Rules\n\n";

    function loadRulesRecursive(dir: string): void {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                loadRulesRecursive(fullPath);
            } else if (file.endsWith(".mdc") || file.endsWith(".md")) {
                const content = fs.readFileSync(fullPath, "utf-8");
                const relativePath = path.relative(rulesPath, fullPath);
                rulesContent += `\n## Rule: ${relativePath}\n\n${content}\n`;
            }
        }
    }

    loadRulesRecursive(rulesPath);
    return rulesContent;
}

/**
 * Loads all .claude/commands into context
 */
function loadClaudeCommands(workspacePath: string): string {
    const commandsPath = path.join(workspacePath, ".claude", "commands");
    if (!fs.existsSync(commandsPath)) return "";

    let commandsContent = "\n# Available Slash Commands\n\n";

    const files = fs.readdirSync(commandsPath);
    for (const file of files) {
        if (file.endsWith(".md")) {
            const content = fs.readFileSync(path.join(commandsPath, file), "utf-8");
            const commandName = file.replace(".md", "");
            commandsContent += `\n## Command: /${commandName}\n\n${content}\n`;
        }
    }

    return commandsContent;
}

/**
 * Loads project context files
 */
function loadProjectContext(workspacePath: string): string {
    const contextFiles = [
        ".claude/context.md",
        "AGENTS.md",
        ".cursor/AGENTS.md",
        "README.md",
    ];

    let contextContent = "\n# Project Context\n\n";

    for (const file of contextFiles) {
        const filePath = path.join(workspacePath, file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf-8");
            contextContent += `\n## ${file}\n\n${content}\n`;
        }
    }

    return contextContent;
}

/**
 * Deploys ai-coding-config to the worktree
 */
async function deployAICodingConfig(workspacePath: string): Promise<void> {
    console.log(`[deploy] Deploying ai-coding-config to ${workspacePath}`);

    const configRepo = path.join(process.env.HOME || "~", ".ai_coding_config");

    // Ensure ai-coding-config repo exists
    if (!fs.existsSync(configRepo)) {
        console.log("[deploy] Cloning ai-coding-config repo...");
        execSync(
            `git clone https://github.com/danlawless/ai-coding-config.git ${configRepo}`,
            { stdio: "inherit" }
        );
    } else {
        console.log("[deploy] Updating ai-coding-config repo...");
        execSync("git pull", { cwd: configRepo, stdio: "inherit" });
    }

    // Copy .cursor/rules
    const sourceCursorRules = path.join(configRepo, ".cursor", "rules");
    const targetCursorRules = path.join(workspacePath, ".cursor", "rules");
    if (fs.existsSync(sourceCursorRules)) {
        console.log("[deploy] Copying .cursor/rules...");
        execSync(
            `mkdir -p "${targetCursorRules}" && cp -r "${sourceCursorRules}"/* "${targetCursorRules}"/`,
            { stdio: "inherit" }
        );
    }

    // Copy .claude/commands
    const sourceClaudeCommands = path.join(configRepo, ".claude", "commands");
    const targetClaudeCommands = path.join(workspacePath, ".claude", "commands");
    if (fs.existsSync(sourceClaudeCommands)) {
        console.log("[deploy] Copying .claude/commands...");
        execSync(
            `mkdir -p "${targetClaudeCommands}" && cp -r "${sourceClaudeCommands}"/* "${targetClaudeCommands}"/`,
            { stdio: "inherit" }
        );
    }

    // Copy .claude/agents
    const sourceAgents = path.join(configRepo, ".claude", "agents");
    const targetAgents = path.join(workspacePath, ".claude", "agents");
    if (fs.existsSync(sourceAgents)) {
        console.log("[deploy] Copying .claude/agents...");
        execSync(
            `mkdir -p "${targetAgents}" && cp -r "${sourceAgents}"/* "${targetAgents}"/`,
            { stdio: "inherit" }
        );
    }

    // Copy .claude/skills
    const sourceSkills = path.join(configRepo, ".claude", "skills");
    const targetSkills = path.join(workspacePath, ".claude", "skills");
    if (fs.existsSync(sourceSkills)) {
        console.log("[deploy] Copying .claude/skills...");
        execSync(
            `mkdir -p "${targetSkills}" && cp -r "${sourceSkills}"/* "${targetSkills}"/`,
            { stdio: "inherit" }
        );
    }

    // Copy .github/workflows (if exists)
    const sourceWorkflows = path.join(configRepo, ".github", "workflows");
    const targetWorkflows = path.join(workspacePath, ".github", "workflows");
    if (fs.existsSync(sourceWorkflows)) {
        console.log("[deploy] Copying .github/workflows...");
        execSync(
            `mkdir -p "${targetWorkflows}" && cp -r "${sourceWorkflows}"/* "${targetWorkflows}"/`,
            { stdio: "inherit" }
        );
    }

    console.log("[deploy] ai-coding-config deployment complete");
}

/**
 * Builds the complete system prompt with all context
 */
function buildSystemPrompt(workspacePath: string, agentName: string): string {
    const rules = loadCursorRules(workspacePath);
    const commands = loadClaudeCommands(workspacePath);
    const context = loadProjectContext(workspacePath);

    return `You are ${agentName}, an autonomous development agent executing tasks in a swarm environment.

You have full autonomous permissions to read, write, edit files and execute bash commands.

${rules}

${commands}

${context}

## Your Mission

Execute development tasks completely and autonomously:
1. Understand the task requirements
2. Implement the solution following project standards
3. Run validation (tests, linting, type-checking)
4. Fix any issues found
5. Create well-structured commits
6. Push the branch
7. Create a pull request

Follow the /autotask workflow and all project rules exactly.

You are working in a git worktree at: ${workspacePath}

## Tool Usage

Use the provided tools to:
- Read files to understand the codebase
- Write new files or edit existing ones
- Execute bash commands (git, npm, tests, etc.)
- Search the codebase with grep

Work systematically and thoroughly. Report progress as you go.`;
}

/**
 * Defines the tools available to the agent
 */
function defineTools(): Tool[] {
    return [
        {
            name: "read_file",
            description: "Read the contents of a file",
            input_schema: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Path to the file to read",
                    },
                },
                required: ["path"],
            },
        },
        {
            name: "write_file",
            description: "Write content to a file (creates or overwrites)",
            input_schema: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Path to the file to write",
                    },
                    content: {
                        type: "string",
                        description: "Content to write to the file",
                    },
                },
                required: ["path", "content"],
            },
        },
        {
            name: "edit_file",
            description: "Edit a file by replacing old_text with new_text",
            input_schema: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Path to the file to edit",
                    },
                    old_text: {
                        type: "string",
                        description: "Text to find and replace",
                    },
                    new_text: {
                        type: "string",
                        description: "Text to replace with",
                    },
                },
                required: ["path", "old_text", "new_text"],
            },
        },
        {
            name: "bash",
            description: "Execute a bash command",
            input_schema: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "The bash command to execute",
                    },
                    cwd: {
                        type: "string",
                        description: "Working directory (optional)",
                    },
                },
                required: ["command"],
            },
        },
        {
            name: "grep",
            description: "Search for text in files using ripgrep",
            input_schema: {
                type: "object",
                properties: {
                    pattern: {
                        type: "string",
                        description: "The search pattern (regex)",
                    },
                    path: {
                        type: "string",
                        description: "Directory or file to search in (optional)",
                    },
                    glob: {
                        type: "string",
                        description: "Glob pattern to filter files (optional)",
                    },
                },
                required: ["pattern"],
            },
        },
        {
            name: "glob",
            description: "Find files matching a glob pattern",
            input_schema: {
                type: "object",
                properties: {
                    pattern: {
                        type: "string",
                        description: "Glob pattern (e.g., **/*.ts)",
                    },
                    path: {
                        type: "string",
                        description: "Directory to search in (optional)",
                    },
                },
                required: ["pattern"],
            },
        },
    ];
}

/**
 * Execute a tool call
 */
function executeTool(
    toolName: string,
    toolInput: Record<string, string>,
    workspacePath: string
): string {
    try {
        switch (toolName) {
            case "read_file": {
                const filePath = path.resolve(workspacePath, toolInput.path);
                return fs.readFileSync(filePath, "utf-8");
            }

            case "write_file": {
                const filePath = path.resolve(workspacePath, toolInput.path);
                fs.mkdirSync(path.dirname(filePath), {
                    recursive: true,
                });
                fs.writeFileSync(filePath, toolInput.content);
                return `Successfully wrote to ${toolInput.path}`;
            }

            case "edit_file": {
                const filePath = path.resolve(workspacePath, toolInput.path);
                let content = fs.readFileSync(filePath, "utf-8");
                if (!content.includes(toolInput.old_text)) {
                    return `Error: Could not find text to replace in ${toolInput.path}`;
                }
                content = content.replace(toolInput.old_text, toolInput.new_text);
                fs.writeFileSync(filePath, content);
                return `Successfully edited ${toolInput.path}`;
            }

            case "bash": {
                const cwd = toolInput.cwd
                    ? path.resolve(workspacePath, toolInput.cwd)
                    : workspacePath;
                const result = execSync(toolInput.command, {
                    cwd,
                    encoding: "utf-8",
                    maxBuffer: 10 * 1024 * 1024, // 10MB
                    env: {
                        ...process.env,
                        SWARM_ISSUE_NUMBER: (global as any).__SWARM_ISSUE_NUMBER || "",
                        SWARM_AGENT_NAME: (global as any).__SWARM_AGENT_NAME || "",
                    },
                });
                return result;
            }

            case "grep": {
                const searchPath = toolInput.path || ".";
                let command = `rg "${toolInput.pattern}" "${searchPath}"`;
                if (toolInput.glob) {
                    command += ` --glob "${toolInput.glob}"`;
                }
                const result = execSync(command, {
                    cwd: workspacePath,
                    encoding: "utf-8",
                    maxBuffer: 10 * 1024 * 1024,
                });
                return result;
            }

            case "glob": {
                const searchPath = toolInput.path || ".";
                const command = `find "${searchPath}" -name "${toolInput.pattern}"`;
                const result = execSync(command, {
                    cwd: workspacePath,
                    encoding: "utf-8",
                    maxBuffer: 10 * 1024 * 1024,
                });
                return result;
            }

            default:
                return `Error: Unknown tool ${toolName}`;
        }
    } catch (error) {
        const err = error as Error & { stdout?: string; stderr?: string };
        return `Error executing ${toolName}: ${err.message}\n${err.stdout || ""}\n${err.stderr || ""}`;
    }
}

/**
 * Main execution function
 */
export async function executeTask(
    request: TaskRequest,
    workspacePath: string,
    agentName: string
): Promise<TaskResult> {
    const startTime = Date.now();

    try {
        // Set global context for bash tool
        (global as any).__SWARM_ISSUE_NUMBER = request.task_id;
        (global as any).__SWARM_AGENT_NAME = agentName;

        // Step 1: Deploy ai-coding-config
        await deployAICodingConfig(workspacePath);

        // Step 2: Build system prompt with all context
        const systemPrompt = buildSystemPrompt(workspacePath, agentName);

        // Step 3: Build user prompt following /autotask workflow
        const userPrompt = `Execute this task following the /autotask workflow from start to completion.

**Task ID**: ${request.task_id}
**Branch**: ${request.branch}
**Base Branch**: ${request.base_branch}

${request.prompt}

## Execution Instructions

Follow the complete /autotask workflow as defined in .claude/commands/autotask.md:

1. **Task Preparation**: Understand requirements, post GitHub issue update (Checkpoint 1)
2. **Worktree Setup**: Use /setup-environment command to create isolated worktree
3. **Implementation**: Follow project standards, implement the solution
4. **Validation**: Run tests, linting, fix any issues
5. **Create PR**: Commit changes, push branch, create pull request
6. **Bot Feedback**: Address any bot feedback autonomously
7. **Completion**: Post final status to GitHub issue

**GitHub Issue Integration**: Use environment variable SWARM_ISSUE_NUMBER=${request.task_id}

Post progress updates to issue #${request.task_id} at each checkpoint using:
\`\`\`bash
.claude/helpers/github-issue-update.sh ${request.task_id} "<stage>" "<status>" "<message>"
\`\`\`

Work autonomously and deliver a PR-ready solution.`;

        // Step 4: Execute via Claude API
        const client = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const tools = defineTools();
        const messages: Anthropic.Messages.MessageParam[] = [
            { role: "user", content: userPrompt },
        ];

        let continueLoop = true;
        let toolUseCount = 0;
        const maxToolUses = 100; // Safety limit

        while (continueLoop && toolUseCount < maxToolUses) {
            const response = await client.messages.create({
                model: "claude-sonnet-4-5",
                max_tokens: 8096,
                system: systemPrompt,
                messages,
                tools,
            });

            console.log(`[agent] Response stop_reason: ${response.stop_reason}`);

            // Add assistant's response to messages
            messages.push({ role: "assistant", content: response.content });

            if (response.stop_reason === "tool_use") {
                // Execute tool calls
                const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

                for (const block of response.content) {
                    if (block.type === "tool_use") {
                        toolUseCount++;
                        console.log(`[agent] Tool use #${toolUseCount}: ${block.name}`);

                        const result = executeTool(
                            block.name,
                            block.input as Record<string, string>,
                            workspacePath
                        );

                        toolResults.push({
                            type: "tool_result",
                            tool_use_id: block.id,
                            content: result,
                        });
                    }
                }

                // Add tool results to messages
                messages.push({ role: "user", content: toolResults });
            } else {
                // Task complete
                continueLoop = false;
            }
        }

        const duration = Date.now() - startTime;
        return {
            success: true,
            duration_ms: duration,
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        const err = error as Error;
        return {
            success: false,
            error: err.message,
            duration_ms: duration,
        };
    }
}
