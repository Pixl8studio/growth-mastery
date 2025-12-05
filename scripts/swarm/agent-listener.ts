#!/usr/bin/env tsx

/**
 * Swarm Agent Listener
 *
 * This service runs on remote VMs and accepts task execution requests
 * from the swarm orchestrator. It executes tasks using Claude Code and
 * returns the results.
 */

import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { config } from "dotenv";

// ============================================================================
// Environment Setup
// ============================================================================

// Load .env.local if it exists
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    config({ path: envPath });
    console.log(`[swarm-agent] ✅ Loaded environment from ${envPath}`);
} else {
    console.log(`[swarm-agent] ⚠️  No .env.local found at ${envPath}`);
}

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.SWARM_AGENT_PORT || "3847");
const AGENT_NAME = process.env.SWARM_AGENT_NAME || "swarm-agent";
const WORKSPACE_DIR = process.env.SWARM_WORKSPACE || process.cwd();
const MAX_TASK_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// Types
// ============================================================================

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

interface AgentStatus {
    agent_name: string;
    status: "idle" | "busy";
    current_task?: string;
    uptime_seconds: number;
    tasks_completed: number;
    tasks_failed: number;
}

// ============================================================================
// Agent State
// ============================================================================

class AgentState {
    private currentTask: string | null = null;
    private startTime = Date.now();
    private tasksCompleted = 0;
    private tasksFailed = 0;

    isBusy(): boolean {
        return this.currentTask !== null;
    }

    startTask(taskId: string) {
        this.currentTask = taskId;
    }

    completeTask(success: boolean) {
        if (success) {
            this.tasksCompleted++;
        } else {
            this.tasksFailed++;
        }
        this.currentTask = null;
    }

    getStatus(): AgentStatus {
        return {
            agent_name: AGENT_NAME,
            status: this.currentTask ? "busy" : "idle",
            current_task: this.currentTask || undefined,
            uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
            tasks_completed: this.tasksCompleted,
            tasks_failed: this.tasksFailed,
        };
    }
}

const agentState = new AgentState();

// ============================================================================
// Logger
// ============================================================================

class Logger {
    private prefix = `[${AGENT_NAME}]`;

    info(message: string) {
        console.log(`${this.prefix} ℹ️  ${message}`);
    }

    success(message: string) {
        console.log(`${this.prefix} ✅ ${message}`);
    }

    error(message: string) {
        console.error(`${this.prefix} ❌ ${message}`);
    }

    task(taskId: string, message: string) {
        console.log(`${this.prefix} 🔷 [Task ${taskId}] ${message}`);
    }
}

const logger = new Logger();

// ============================================================================
// Environment Validator
// ============================================================================

interface EnvironmentStatus {
    envFile: boolean;
    nodeModules: boolean;
    gitConfig: boolean;
    claudeCommands: number;
    cursorRules: number;
    issues: string[];
    warnings: string[];
}

class EnvironmentValidator {
    validate(workspaceDir: string): EnvironmentStatus {
        const status: EnvironmentStatus = {
            envFile: false,
            nodeModules: false,
            gitConfig: false,
            claudeCommands: 0,
            cursorRules: 0,
            issues: [],
            warnings: [],
        };

        // Check .env.local
        const envPath = path.join(workspaceDir, ".env.local");
        status.envFile = fs.existsSync(envPath);
        if (!status.envFile) {
            status.warnings.push("No .env.local file found");
        }

        // Check node_modules
        const nodeModulesPath = path.join(workspaceDir, "node_modules");
        status.nodeModules = fs.existsSync(nodeModulesPath);
        if (!status.nodeModules) {
            status.issues.push(
                "node_modules not found - dependencies may not be installed"
            );
        }

        // Check git config
        const gitConfigPath = path.join(workspaceDir, ".git", "config");
        status.gitConfig = fs.existsSync(gitConfigPath);
        if (!status.gitConfig) {
            status.issues.push("Git not initialized");
        }

        // Count Claude commands
        const claudeCommandsPath = path.join(workspaceDir, ".claude", "commands");
        if (fs.existsSync(claudeCommandsPath)) {
            status.claudeCommands = fs
                .readdirSync(claudeCommandsPath)
                .filter((f) => f.endsWith(".md")).length;
        } else {
            status.warnings.push(".claude/commands directory not found");
        }

        // Count Cursor rules
        const cursorRulesPath = path.join(workspaceDir, ".cursor", "rules");
        if (fs.existsSync(cursorRulesPath)) {
            const countRules = (dir: string): number => {
                let count = 0;
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        count += countRules(fullPath);
                    } else if (file.endsWith(".mdc")) {
                        count++;
                    }
                }
                return count;
            };
            status.cursorRules = countRules(cursorRulesPath);
        } else {
            status.warnings.push(".cursor/rules directory not found");
        }

        return status;
    }

    formatReport(status: EnvironmentStatus): string {
        const lines: string[] = [];

        lines.push("**Environment Status:**");
        lines.push(
            `- ${status.envFile ? "✅" : "⚠️"} .env.local ${status.envFile ? "exists" : "missing"}`
        );
        lines.push(
            `- ${status.nodeModules ? "✅" : "❌"} node_modules ${status.nodeModules ? "installed" : "missing"}`
        );
        lines.push(
            `- ${status.gitConfig ? "✅" : "❌"} Git ${status.gitConfig ? "configured" : "not initialized"}`
        );
        lines.push(`- ✅ ${status.claudeCommands} Claude commands available`);
        lines.push(`- ✅ ${status.cursorRules} Cursor rules loaded`);

        if (status.issues.length > 0) {
            lines.push("");
            lines.push("**❌ Issues:**");
            status.issues.forEach((issue) => lines.push(`- ${issue}`));
        }

        if (status.warnings.length > 0) {
            lines.push("");
            lines.push("**⚠️ Warnings:**");
            status.warnings.forEach((warning) => lines.push(`- ${warning}`));
        }

        return lines.join("\n");
    }
}

const envValidator = new EnvironmentValidator();

// ============================================================================
// Task Executor
// ============================================================================

class TaskExecutor {
    async executeTask(request: TaskRequest): Promise<TaskResult> {
        const startTime = Date.now();

        logger.task(request.task_id, "Starting execution");
        logger.info(`Branch: ${request.branch}`);
        logger.info(`Base: ${request.base_branch}`);

        try {
            // Step 1: Ensure we're in the workspace directory
            process.chdir(WORKSPACE_DIR);
            logger.info(`Working directory: ${WORKSPACE_DIR}`);

            // Step 2: Validate environment and post to GitHub
            const envStatus = envValidator.validate(WORKSPACE_DIR);
            const envReport = envValidator.formatReport(envStatus);

            logger.info("Environment validation:");
            logger.info(envReport);

            // Post environment status to GitHub issue
            await this.postEnvironmentStatus(request.task_id, envReport);

            // Step 2: Checkout base branch and pull latest
            logger.info(`Checking out base branch: ${request.base_branch}`);
            this.execCommand(`git checkout ${request.base_branch}`);

            try {
                this.execCommand(`git pull origin ${request.base_branch}`);
            } catch (error) {
                logger.error(
                    `Failed to pull from ${request.base_branch}: ${error instanceof Error ? error.message : String(error)}`
                );
                logger.info("Continuing with local branch...");
            }

            // Step 3: Create or checkout task branch
            logger.info(`Creating branch: ${request.branch}`);
            try {
                this.execCommand(`git rev-parse --verify ${request.branch}`, true);
                logger.info(`Branch ${request.branch} already exists, checking out`);
                this.execCommand(`git checkout ${request.branch}`);
            } catch {
                this.execCommand(`git checkout -b ${request.branch}`);
            }

            // Step 4: Write task prompt to file
            const taskFile = path.join(
                WORKSPACE_DIR,
                ".swarm",
                `task-${request.task_id}-prompt.md`
            );

            if (!fs.existsSync(path.dirname(taskFile))) {
                fs.mkdirSync(path.dirname(taskFile), { recursive: true });
            }

            fs.writeFileSync(
                taskFile,
                `# Task ${request.task_id}: ${request.branch}

## Prompt
${request.prompt}

## Context
- **Issue**: #${request.task_id}
- **Branch**: ${request.branch}
- **Base**: ${request.base_branch}
- **Agent**: ${AGENT_NAME}
- **Started**: ${new Date().toISOString()}

## Instructions
This task is being executed autonomously by the swarm agent.
The agent will:
1. Implement the changes described in the prompt
2. Run validation (tests, linting, type-checking)
3. Fix any issues found
4. Create well-structured commits
5. Push the branch to origin

The orchestrator will handle PR creation after completion.
`
            );

            logger.info(`Task prompt saved to: ${taskFile}`);

            // Step 5: Execute /autotask - handles everything autonomously
            // (creates worktree, makes changes, commits, pushes, creates PR)
            const success = await this.runClaudeCode(request);

            if (!success) {
                throw new Error("/autotask execution failed");
            }

            const duration = Date.now() - startTime;
            logger.success(
                `Task ${request.task_id} completed in ${Math.round(duration / 1000)}s`
            );

            return {
                success: true,
                duration_ms: duration,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);

            logger.error(`Task ${request.task_id} failed: ${errorMsg}`);

            return {
                success: false,
                error: errorMsg,
                duration_ms: duration,
            };
        }
    }

    private async runClaudeCode(request: TaskRequest): Promise<boolean> {
        logger.info(`Executing /autotask for GitHub issue #${request.task_id}`);

        try {
            // Execute /autotask with the issue number
            // /autotask handles: git worktrees, code changes, commits, push, PR creation
            // Pass agent name via environment variable for swarm context awareness
            const command = `claude /autotask ${request.task_id}`;

            logger.info(`Running: ${command}`);
            logger.info(`Swarm Agent: ${AGENT_NAME}`);
            logger.info(`Branch: ${request.branch}`);

            const result = execSync(command, {
                encoding: "utf8",
                cwd: WORKSPACE_DIR,
                stdio: ["pipe", "pipe", "pipe"],
                timeout: MAX_TASK_TIMEOUT,
                env: {
                    ...process.env,
                    SWARM_AGENT_NAME: AGENT_NAME,
                    SWARM_BRANCH: request.branch,
                    SWARM_ISSUE_NUMBER: request.task_id,
                },
            });

            logger.info(`/autotask completed successfully`);
            logger.info(result.toString());

            return true;
        } catch (error) {
            logger.error(`/autotask failed: ${error}`);
            if (error instanceof Error && "stdout" in error) {
                logger.error(`Output: ${(error as any).stdout}`);
                logger.error(`Error: ${(error as any).stderr}`);
            }
            return false;
        }
    }

    private async postEnvironmentStatus(
        issueNumber: string,
        envReport: string
    ): Promise<void> {
        try {
            // Check if gh CLI is available
            if (!this.isGhAvailable()) {
                logger.info("GitHub CLI not available, skipping environment report");
                return;
            }

            const comment = `🤖 **Agent Environment Check** - ${AGENT_NAME}

${envReport}

---
*Agent ready: ${new Date().toISOString()}*`;

            const escapedComment = comment
                .replace(/"/g, '\\"')
                .replace(/\$/g, "\\$")
                .replace(/`/g, "\\`");

            execSync(`gh issue comment ${issueNumber} --body "${escapedComment}"`, {
                stdio: "pipe",
                cwd: WORKSPACE_DIR,
            });

            logger.info(`✓ Posted environment status to issue #${issueNumber}`);
        } catch (error) {
            logger.error(
                `Failed to post environment status: ${error instanceof Error ? error.message : String(error)}`
            );
            // Don't fail the task if we can't post to GitHub
        }
    }

    private isGhAvailable(): boolean {
        try {
            execSync("command -v gh", { stdio: "pipe" });
            return true;
        } catch {
            return false;
        }
    }

    private execCommand(command: string, silent: boolean = false): string {
        logger.info(`$ ${command}`);

        try {
            const result = execSync(command, {
                encoding: "utf8",
                stdio: silent ? "pipe" : "inherit",
                cwd: WORKSPACE_DIR,
            });
            return result || "";
        } catch (error) {
            if (!silent) {
                throw error;
            }
            throw error;
        }
    }
}

const executor = new TaskExecutor();

// ============================================================================
// HTTP Server
// ============================================================================

function sendJSON(res: http.ServerResponse, statusCode: number, data: any) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data, null, 2));
}

function sendError(res: http.ServerResponse, statusCode: number, message: string) {
    sendJSON(res, statusCode, { error: message });
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = req.url || "/";
    const method = req.method || "GET";

    logger.info(`${method} ${url}`);

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
    }

    // Health check endpoint
    if (url === "/health" && method === "GET") {
        sendJSON(res, 200, { status: "healthy", agent: AGENT_NAME });
        return;
    }

    // Status endpoint
    if (url === "/status" && method === "GET") {
        sendJSON(res, 200, agentState.getStatus());
        return;
    }

    // Execute task endpoint
    if (url === "/execute" && method === "POST") {
        // Check if already busy
        if (agentState.isBusy()) {
            sendError(res, 503, "Agent is busy with another task");
            return;
        }

        // Parse request body
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });

        req.on("end", async () => {
            try {
                const taskRequest: TaskRequest = JSON.parse(body);

                // Validate request
                if (
                    !taskRequest.task_id ||
                    !taskRequest.prompt ||
                    !taskRequest.branch ||
                    !taskRequest.base_branch
                ) {
                    sendError(res, 400, "Missing required fields in task request");
                    return;
                }

                // Mark agent as busy
                agentState.startTask(taskRequest.task_id);

                // Execute task (with timeout)
                const timeoutPromise = new Promise<TaskResult>((_, reject) => {
                    setTimeout(
                        () => reject(new Error("Task execution timeout")),
                        MAX_TASK_TIMEOUT
                    );
                });

                const executionPromise = executor.executeTask(taskRequest);

                const result = await Promise.race([executionPromise, timeoutPromise]);

                // Mark agent as idle
                agentState.completeTask(result.success);

                // Send response
                sendJSON(res, 200, result);
            } catch (error) {
                agentState.completeTask(false);

                const errorMsg = error instanceof Error ? error.message : String(error);
                logger.error(`Request handling error: ${errorMsg}`);
                sendError(res, 500, errorMsg);
            }
        });

        return;
    }

    // 404 for unknown routes
    sendError(res, 404, "Not found");
}

// ============================================================================
// Server Startup
// ============================================================================

async function startServer() {
    logger.info("Starting Swarm Agent Listener");
    logger.info(`Agent Name: ${AGENT_NAME}`);
    logger.info(`Port: ${PORT}`);
    logger.info(`Workspace: ${WORKSPACE_DIR}`);

    // Verify we're in a git repository
    try {
        execSync("git rev-parse --git-dir", { stdio: "pipe", cwd: WORKSPACE_DIR });
        logger.success("Git repository detected");
    } catch {
        logger.error("Not a git repository! Agent requires a git workspace.");
        process.exit(1);
    }

    // Create HTTP server
    const server = http.createServer(handleRequest);

    server.listen(PORT, () => {
        logger.success(`Agent listening on http://localhost:${PORT}`);
        logger.info("Endpoints:");
        logger.info(`  GET  /health  - Health check`);
        logger.info(`  GET  /status  - Agent status`);
        logger.info(`  POST /execute - Execute task`);
        logger.info("");
        logger.info("🤖 Agent is ready to accept tasks!");
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
        logger.info("Received SIGTERM, shutting down gracefully");
        server.close(() => {
            logger.info("Server closed");
            process.exit(0);
        });
    });

    process.on("SIGINT", () => {
        logger.info("Received SIGINT, shutting down gracefully");
        server.close(() => {
            logger.info("Server closed");
            process.exit(0);
        });
    });
}

// ============================================================================
// Entry Point
// ============================================================================

if (require.main === module) {
    startServer().catch((error) => {
        logger.error(`Fatal error: ${error}`);
        process.exit(1);
    });
}
