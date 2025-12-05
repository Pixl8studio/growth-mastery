#!/usr/bin/env tsx

/**
 * Swarm Orchestrator
 *
 * Executes batches of development tasks from YAML manifests.
 * Each task runs as an autonomous /autotask execution with its own branch and PR.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync, spawn } from "child_process";
import * as yaml from "yaml";

// ============================================================================
// Types
// ============================================================================

interface WorkManifest {
    name: string;
    repo?: string;
    base_branch: string;
    default_priority?: "high" | "medium" | "low";
    max_parallel?: number;
    tasks: Task[];
}

interface Task {
    id: string;
    prompt: string;
    branch: string;
    priority?: "high" | "medium" | "low";
    depends_on?: string[];
    agent_hint?: string;
    timeout?: string;
}

interface TaskState {
    status: "queued" | "in_progress" | "completed" | "failed" | "blocked";
    branch?: string;
    pr_number?: number;
    pr_url?: string;
    started_at?: string;
    completed_at?: string;
    error?: string;
    duration_minutes?: number;
}

interface SwarmState {
    manifest_path: string;
    manifest_name: string;
    started_at: string;
    completed_at?: string;
    base_branch: string;
    tasks: Record<string, TaskState>;
}

interface OrchestratorOptions {
    manifestPath: string;
    local: boolean;
    verbose: boolean;
    resume: boolean;
    dryRun: boolean;
}

interface AgentConfig {
    name: string;
    host: string;
    port: number;
    status_endpoint: string;
    execute_endpoint: string;
    enabled: boolean;
}

interface AgentsConfig {
    agents: AgentConfig[];
}

interface AgentStatus {
    status: "idle" | "busy" | "offline";
    current_task?: string;
    load?: number;
}

interface AgentTaskRequest {
    task_id: string;
    prompt: string;
    branch: string;
    base_branch: string;
    repo?: string;
}

// ============================================================================
// Logger with verbosity control
// ============================================================================

class Logger {
    private isVerbose: boolean;

    constructor(verbose: boolean) {
        this.isVerbose = verbose;
    }

    info(message: string) {
        console.log(`\n📋 ${message}`);
    }

    success(message: string) {
        console.log(`\n✅ ${message}`);
    }

    error(message: string) {
        console.error(`\n❌ ${message}`);
    }

    warning(message: string) {
        console.warn(`\n⚠️  ${message}`);
    }

    task(taskId: string, message: string) {
        console.log(`\n🔷 [Task ${taskId}] ${message}`);
    }

    verbose(message: string) {
        if (this.isVerbose) {
            console.log(`   ${message}`);
        }
    }

    step(step: string) {
        console.log(`\n   → ${step}`);
    }
}

// ============================================================================
// Agent Pool - Remote Agent Discovery and Management
// ============================================================================

class AgentPool {
    private agents: AgentConfig[] = [];
    private agentStatus: Map<string, AgentStatus> = new Map();

    constructor(private logger: Logger) {}

    /**
     * Load agent configuration from .swarm/agents.yaml
     */
    async loadAgents(): Promise<void> {
        const agentsPath = path.join(process.cwd(), ".swarm/agents.yaml");

        if (!fs.existsSync(agentsPath)) {
            this.logger.verbose("No agents.yaml found, will run in local mode");
            return;
        }

        try {
            const content = fs.readFileSync(agentsPath, "utf-8");
            const config: AgentsConfig = yaml.parse(content);

            this.agents = config.agents.filter((a) => a.enabled);
            this.logger.verbose(
                `Loaded ${this.agents.length} agents from configuration`
            );

            // Check health of all agents
            await this.checkAllAgents();
        } catch (error) {
            this.logger.warning(
                `Failed to load agents: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Check health of all configured agents
     */
    private async checkAllAgents(): Promise<void> {
        const checks = this.agents.map((agent) => this.checkAgent(agent));
        await Promise.all(checks);
    }

    /**
     * Check if a specific agent is healthy
     */
    private async checkAgent(agent: AgentConfig): Promise<void> {
        try {
            const url = `http://${agent.host}:${agent.port}/health`;
            const response = await fetch(url, {
                method: "GET",
                signal: AbortSignal.timeout(5000),
            });

            if (response.ok) {
                this.agentStatus.set(agent.name, { status: "idle" });
                this.logger.verbose(`✓ Agent ${agent.name} is healthy`);
            } else {
                this.agentStatus.set(agent.name, { status: "offline" });
                this.logger.verbose(
                    `✗ Agent ${agent.name} is offline (HTTP ${response.status})`
                );
            }
        } catch (error) {
            this.agentStatus.set(agent.name, { status: "offline" });
            this.logger.verbose(`✗ Agent ${agent.name} is offline`);
        }
    }

    /**
     * Get an available agent for task execution
     */
    async getAvailableAgent(): Promise<AgentConfig | null> {
        // Refresh agent statuses
        await this.checkAllAgents();

        // Find first idle agent
        for (const agent of this.agents) {
            const status = this.agentStatus.get(agent.name);
            if (status?.status === "idle") {
                return agent;
            }
        }

        return null;
    }

    /**
     * Execute a task on a remote agent
     */
    async executeOnAgent(
        agent: AgentConfig,
        taskRequest: AgentTaskRequest
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Mark agent as busy
            this.agentStatus.set(agent.name, {
                status: "busy",
                current_task: taskRequest.task_id,
            });

            const url = `http://${agent.host}:${agent.port}${agent.execute_endpoint}`;

            this.logger.verbose(`Sending task ${taskRequest.task_id} to ${agent.name}`);

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(taskRequest),
                signal: AbortSignal.timeout(600000), // 10 minute timeout
            });

            if (!response.ok) {
                throw new Error(`Agent returned HTTP ${response.status}`);
            }

            const result = await response.json();

            // Mark agent as idle again
            this.agentStatus.set(agent.name, { status: "idle" });

            return { success: result.success !== false, error: result.error };
        } catch (error) {
            // Mark agent as offline if communication failed
            this.agentStatus.set(agent.name, { status: "offline" });

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /**
     * Get count of healthy agents
     */
    getHealthyAgentCount(): number {
        let count = 0;
        for (const status of this.agentStatus.values()) {
            if (status.status === "idle" || status.status === "busy") {
                count++;
            }
        }
        return count;
    }

    /**
     * Check if any agents are available
     */
    hasAgents(): boolean {
        return this.agents.length > 0 && this.getHealthyAgentCount() > 0;
    }
}

// ============================================================================
// GitHub Issue Tracker
// ============================================================================

class GitHubIssueTracker {
    constructor(private logger: Logger) {}

    async updateIssue(
        issueNumber: string,
        comment: string,
        labels?: { add?: string[]; remove?: string[] }
    ) {
        try {
            // Post comment to issue
            this.logger.verbose(`Posting comment to issue #${issueNumber}`);
            execSync(
                `gh issue comment ${issueNumber} --body "${this.escapeComment(comment)}"`,
                {
                    stdio: "pipe",
                }
            );

            // Update labels if provided
            if (labels) {
                if (labels.remove && labels.remove.length > 0) {
                    for (const label of labels.remove) {
                        try {
                            execSync(
                                `gh issue edit ${issueNumber} --remove-label "${label}"`,
                                {
                                    stdio: "pipe",
                                }
                            );
                        } catch (e) {
                            // Label might not exist, ignore
                        }
                    }
                }
                if (labels.add && labels.add.length > 0) {
                    for (const label of labels.add) {
                        execSync(
                            `gh issue edit ${issueNumber} --add-label "${label}"`,
                            {
                                stdio: "pipe",
                            }
                        );
                    }
                }
            }

            this.logger.verbose(`✓ Updated issue #${issueNumber}`);
        } catch (error) {
            this.logger.error(`Failed to update issue #${issueNumber}: ${error}`);
        }
    }

    async postTaskClaimed(
        issueNumber: string,
        branch: string,
        agent: string = "local"
    ) {
        const comment = `🤖 **Swarm Bot**: Task claimed

**Agent:** \`${agent}\`
**Branch:** \`${branch}\`
**Started:** ${new Date().toISOString()}

Working on this now...

---
*Swarm ID: swarm-${Date.now()}*`;

        await this.updateIssue(issueNumber, comment, {
            remove: ["swarm-ready"],
            add: ["swarm:in-progress"],
        });
    }

    async postProgressUpdate(
        issueNumber: string,
        progress: string,
        stage: string,
        elapsed: string
    ) {
        const comment = `🤖 **Swarm Bot**: Progress update

**Status:** In Progress (${progress})
**Current stage:** ${stage}
**Elapsed:** ${elapsed}

---
*Updated: ${new Date().toISOString()}*`;

        await this.updateIssue(issueNumber, comment);
    }

    async postPRCreated(
        issueNumber: string,
        prNumber: number,
        prUrl: string,
        branch: string,
        duration: string,
        summary: string
    ) {
        const comment = `🤖 **Swarm Bot**: ✅ PR Ready for Review!

**Pull Request:** #${prNumber}
**Branch:** \`${branch}\`
**Duration:** ${duration}

### Summary
${summary}

**PR URL:** ${prUrl}

---
*Completed: ${new Date().toISOString()}*`;

        await this.updateIssue(issueNumber, comment, {
            remove: ["swarm:in-progress"],
            add: ["swarm:pr-ready"],
        });
    }

    async postTaskFailed(
        issueNumber: string,
        error: string,
        duration: string,
        stage: string
    ) {
        const comment = `🤖 **Swarm Bot**: ❌ Task Failed

**Duration:** ${duration}
**Stage:** ${stage}

### Error
\`\`\`
${error}
\`\`\`

### Next Steps
- Review the error above
- Fix and retry with \`/swarm --retry ${issueNumber}\`
- Or remove \`swarm-ready\` label to skip

---
*Failed: ${new Date().toISOString()}*`;

        await this.updateIssue(issueNumber, comment, {
            remove: ["swarm:in-progress"],
            add: ["swarm:failed"],
        });
    }

    async postDependencyWaiting(
        issueNumber: string,
        dependencies: Array<{ id: string; status: string }>
    ) {
        const depsList = dependencies
            .map(
                (d) =>
                    `- [${d.status === "completed" ? "x" : " "}] #${d.id} (${d.status})`
            )
            .join("\n");

        const comment = `🤖 **Swarm Bot**: ⏳ Waiting for dependencies

This issue depends on:
${depsList}

Will automatically start when dependencies complete.

---
*Queued: ${new Date().toISOString()}*`;

        await this.updateIssue(issueNumber, comment, {
            add: ["swarm:blocked"],
        });
    }

    private escapeComment(comment: string): string {
        return comment.replace(/"/g, '\\"').replace(/\$/g, "\\$");
    }
}

// ============================================================================
// Manifest Parser & Validator
// ============================================================================

class ManifestParser {
    constructor(private logger: Logger) {}

    parse(manifestPath: string): WorkManifest {
        this.logger.info(`Parsing manifest: ${manifestPath}`);

        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Manifest file not found: ${manifestPath}`);
        }

        const content = fs.readFileSync(manifestPath, "utf8");
        const manifest = yaml.parse(content) as WorkManifest;

        this.validate(manifest);

        this.logger.success(
            `Manifest parsed successfully: ${manifest.tasks.length} tasks`
        );
        return manifest;
    }

    private validate(manifest: WorkManifest) {
        this.logger.step("Validating manifest structure...");

        // Required fields
        if (!manifest.name) {
            throw new Error("Manifest missing required field: name");
        }
        if (!manifest.base_branch) {
            throw new Error("Manifest missing required field: base_branch");
        }
        if (!manifest.tasks || manifest.tasks.length === 0) {
            throw new Error("Manifest must have at least one task");
        }

        // Task validation
        const taskIds = new Set<string>();
        const branches = new Set<string>();

        for (const task of manifest.tasks) {
            // Required task fields
            if (!task.id) throw new Error("Task missing required field: id");
            if (!task.prompt)
                throw new Error(`Task ${task.id} missing required field: prompt`);
            if (!task.branch)
                throw new Error(`Task ${task.id} missing required field: branch`);

            // Unique IDs
            if (taskIds.has(task.id)) {
                throw new Error(`Duplicate task ID: ${task.id}`);
            }
            taskIds.add(task.id);

            // Unique branches
            if (branches.has(task.branch)) {
                throw new Error(`Duplicate branch name: ${task.branch}`);
            }
            branches.add(task.branch);

            // Valid dependencies
            if (task.depends_on) {
                for (const depId of task.depends_on) {
                    if (
                        !taskIds.has(depId) &&
                        !manifest.tasks.find((t) => t.id === depId)
                    ) {
                        throw new Error(
                            `Task ${task.id} depends on non-existent task: ${depId}`
                        );
                    }
                }
            }
        }

        // Check for circular dependencies
        this.checkCircularDependencies(manifest.tasks);

        this.logger.verbose("✓ All validations passed");
    }

    private checkCircularDependencies(tasks: Task[]) {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const taskMap = new Map(tasks.map((t) => [t.id, t]));

        const hasCycle = (taskId: string): boolean => {
            visited.add(taskId);
            recursionStack.add(taskId);

            const task = taskMap.get(taskId);
            if (task?.depends_on) {
                for (const depId of task.depends_on) {
                    if (!visited.has(depId)) {
                        if (hasCycle(depId)) return true;
                    } else if (recursionStack.has(depId)) {
                        return true;
                    }
                }
            }

            recursionStack.delete(taskId);
            return false;
        };

        for (const task of tasks) {
            if (!visited.has(task.id)) {
                if (hasCycle(task.id)) {
                    throw new Error(
                        `Circular dependency detected involving task: ${task.id}`
                    );
                }
            }
        }
    }
}

// ============================================================================
// State Manager
// ============================================================================

class StateManager {
    private stateDir: string;
    private stateFile: string;

    constructor(private logger: Logger) {
        this.stateDir = path.join(process.cwd(), ".swarm");
        this.stateFile = path.join(this.stateDir, "state.json");
    }

    ensureStateDir() {
        if (!fs.existsSync(this.stateDir)) {
            fs.mkdirSync(this.stateDir, { recursive: true });
            this.logger.verbose(`Created state directory: ${this.stateDir}`);
        }
    }

    loadState(): SwarmState | null {
        if (!fs.existsSync(this.stateFile)) {
            return null;
        }

        try {
            const content = fs.readFileSync(this.stateFile, "utf8");
            return JSON.parse(content);
        } catch (error) {
            this.logger.error(`Failed to load state: ${error}`);
            return null;
        }
    }

    saveState(state: SwarmState) {
        this.ensureStateDir();
        fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
        this.logger.verbose(`State saved to ${this.stateFile}`);
    }

    initState(
        manifestPath: string,
        manifestName: string,
        baseBranch: string,
        tasks: Task[]
    ): SwarmState {
        const state: SwarmState = {
            manifest_path: manifestPath,
            manifest_name: manifestName,
            started_at: new Date().toISOString(),
            base_branch: baseBranch,
            tasks: {},
        };

        for (const task of tasks) {
            state.tasks[task.id] = {
                status: "queued",
                branch: task.branch,
            };
        }

        this.saveState(state);
        return state;
    }

    updateTaskState(state: SwarmState, taskId: string, update: Partial<TaskState>) {
        state.tasks[taskId] = { ...state.tasks[taskId], ...update };
        this.saveState(state);
    }
}

// ============================================================================
// Task Executor
// ============================================================================

class TaskExecutor {
    constructor(
        private logger: Logger,
        private issueTracker: GitHubIssueTracker,
        private stateManager: StateManager,
        private agentPool: AgentPool
    ) {}

    async executeTask(
        task: Task,
        state: SwarmState,
        baseBranch: string,
        useRemote: boolean = true
    ): Promise<boolean> {
        const startTime = Date.now();

        this.logger.task(task.id, `Starting execution`);
        this.logger.verbose(`Branch: ${task.branch}`);
        this.logger.verbose(`Base: ${baseBranch}`);
        this.logger.verbose(`Priority: ${task.priority || "medium"}`);

        // Try remote execution first if enabled
        if (useRemote && this.agentPool.hasAgents()) {
            const agent = await this.agentPool.getAvailableAgent();

            if (agent) {
                this.logger.verbose(`Executing on remote agent: ${agent.name}`);

                // Update state and GitHub issue
                this.stateManager.updateTaskState(state, task.id, {
                    status: "in_progress",
                    started_at: new Date().toISOString(),
                });

                await this.issueTracker.postTaskClaimed(
                    task.id,
                    task.branch,
                    agent.name
                );

                // Execute on remote agent
                const result = await this.agentPool.executeOnAgent(agent, {
                    task_id: task.id,
                    prompt: task.prompt,
                    branch: task.branch,
                    base_branch: baseBranch,
                });

                const duration = Math.round((Date.now() - startTime) / 60000);

                if (result.success) {
                    this.logger.success(`Task ${task.id} completed on ${agent.name}`);

                    this.stateManager.updateTaskState(state, task.id, {
                        status: "completed",
                        completed_at: new Date().toISOString(),
                        duration_minutes: duration,
                    });

                    return true;
                } else {
                    this.logger.error(
                        `Task ${task.id} failed on ${agent.name}: ${result.error}`
                    );

                    this.stateManager.updateTaskState(state, task.id, {
                        status: "failed",
                        error: result.error,
                        duration_minutes: duration,
                    });

                    await this.issueTracker.postTaskFailed(
                        task.id,
                        result.error || "Unknown error",
                        `${duration} minutes`,
                        "Remote execution"
                    );

                    return false;
                }
            } else {
                this.logger.warning(
                    `No available remote agents, falling back to local execution`
                );
            }
        }

        // Fall back to local execution
        this.logger.verbose(`Executing locally`);

        // Update state and GitHub issue
        this.stateManager.updateTaskState(state, task.id, {
            status: "in_progress",
            started_at: new Date().toISOString(),
        });

        await this.issueTracker.postTaskClaimed(task.id, task.branch);

        try {
            // Step 1: Create and checkout branch
            this.logger.step(`Creating branch: ${task.branch}`);
            this.execCommand(`git checkout ${baseBranch}`);

            // Try to pull, but don't fail if there are uncommitted changes
            try {
                this.execCommand(`git pull origin ${baseBranch}`);
            } catch (pullError) {
                this.logger.warning(
                    `Could not pull from ${baseBranch}: ${pullError instanceof Error ? pullError.message : String(pullError)}`
                );
                this.logger.warning(`Continuing with local ${baseBranch}...`);
            }

            // Check if branch already exists
            try {
                this.execCommand(`git rev-parse --verify ${task.branch}`, true);
                this.logger.warning(
                    `Branch ${task.branch} already exists, checking out`
                );
                this.execCommand(`git checkout ${task.branch}`);
            } catch {
                // Branch doesn't exist, create it
                this.execCommand(`git checkout -b ${task.branch}`);
            }

            // Step 2: Execute the task prompt using /autotask
            this.logger.step(`Executing task with /autotask`);
            this.logger.verbose(`Prompt length: ${task.prompt.length} characters`);

            // For now, we'll simulate /autotask by creating a simple marker file
            // In a real implementation, this would call the actual autotask system
            const success = await this.runAutotask(task, state);

            if (!success) {
                throw new Error("Autotask execution failed");
            }

            // Step 3: Create Pull Request
            this.logger.step(`Creating pull request`);
            const prInfo = this.createPullRequest(task, baseBranch);

            // Calculate duration
            const duration = Math.round((Date.now() - startTime) / 60000);
            const durationStr = `${duration} minute${duration !== 1 ? "s" : ""}`;

            // Update state
            this.stateManager.updateTaskState(state, task.id, {
                status: "completed",
                completed_at: new Date().toISOString(),
                pr_number: prInfo.number,
                pr_url: prInfo.url,
                duration_minutes: duration,
            });

            // Update GitHub issue
            await this.issueTracker.postPRCreated(
                task.id,
                prInfo.number,
                prInfo.url,
                task.branch,
                durationStr,
                `Task completed successfully. See PR for details.`
            );

            this.logger.success(
                `Task ${task.id} completed! PR #${prInfo.number}: ${prInfo.url}`
            );
            return true;
        } catch (error) {
            const duration = Math.round((Date.now() - startTime) / 60000);
            const durationStr = `${duration} minute${duration !== 1 ? "s" : ""}`;
            const errorMsg = error instanceof Error ? error.message : String(error);

            this.logger.error(`Task ${task.id} failed: ${errorMsg}`);

            // Update state
            this.stateManager.updateTaskState(state, task.id, {
                status: "failed",
                error: errorMsg,
                completed_at: new Date().toISOString(),
                duration_minutes: duration,
            });

            // Update GitHub issue
            await this.issueTracker.postTaskFailed(
                task.id,
                errorMsg,
                durationStr,
                "execution"
            );

            return false;
        }
    }

    private async runAutotask(task: Task, state: SwarmState): Promise<boolean> {
        this.logger.step(`Delegating to autonomous agent for task execution`);

        // Write the task prompt to a file for the agent to reference
        const taskFile = path.join(
            process.cwd(),
            `.swarm`,
            `task-${task.id}-prompt.md`
        );
        const stateManager = this.stateManager;

        fs.writeFileSync(
            taskFile,
            `# Task ${task.id}: ${task.branch}

## Prompt
${task.prompt}

## Context
- **Issue**: #${task.id}
- **Branch**: ${task.branch}
- **Started**: ${new Date().toISOString()}

## Instructions for Autonomous Agent
This task is being executed as part of a swarm orchestration run. Follow the /autotask workflow:

1. Implement the changes described in the prompt above
2. Run validation (tests, linting, type-checking)
3. Fix any issues found
4. Create well-structured commits
5. Signal completion by returning from this execution

The orchestrator will handle PR creation after completion.
`
        );

        this.logger.verbose(`Task prompt saved to: ${taskFile}`);
        this.logger.info(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║  🤖 AUTONOMOUS EXECUTION MODE                                              ║
║                                                                            ║
║  Task #${task.id.padEnd(3)} will now be executed autonomously                            ║
║                                                                            ║
║  The swarm orchestrator will delegate this task to you (Claude) to        ║
║  implement following the /autotask workflow. After you complete the       ║
║  work and make commits, the orchestrator will continue with PR creation.  ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

        // Return a special indicator that signals this task needs human (Claude) execution
        // The orchestrator will pause and wait for the user to trigger continuation
        throw new Error("AUTOTASK_DELEGATION_REQUIRED");
    }

    private createPullRequest(
        task: Task,
        baseBranch: string
    ): { number: number; url: string } {
        this.logger.verbose(`Pushing branch to remote`);
        this.execCommand(`git push -u origin ${task.branch}`);

        this.logger.verbose(`Creating PR with gh CLI`);

        const prBody = `Closes #${task.id}

## Task Summary
${task.prompt.split("\n").slice(0, 5).join("\n")}

${task.prompt.length > 500 ? "...see full details in issue #" + task.id : ""}

---
🤖 Generated with Swarm Orchestrator`;

        const prTitle = `feat: ${task.branch.split("/").pop()} (#${task.id})`;

        const output = this.execCommand(
            `gh pr create --base ${baseBranch} --head ${task.branch} --title "${prTitle}" --body "${this.escapeShell(prBody)}"`,
            false,
            true
        );

        // Parse PR URL from output
        const urlMatch = output.match(/https:\/\/github\.com\/[^\s]+/);
        const url = urlMatch ? urlMatch[0] : "";

        // Extract PR number from URL
        const numberMatch = url.match(/\/pull\/(\d+)/);
        const number = numberMatch ? parseInt(numberMatch[1]) : 0;

        return { number, url };
    }

    private execCommand(
        command: string,
        silent: boolean = false,
        captureOutput: boolean = false
    ): string {
        this.logger.verbose(`$ ${command}`);

        try {
            const result = execSync(command, {
                encoding: "utf8",
                stdio: silent ? "pipe" : captureOutput ? "pipe" : "inherit",
            });
            return result || "";
        } catch (error: any) {
            if (!silent) {
                throw error;
            }
            throw error;
        }
    }

    private escapeShell(str: string): string {
        return str.replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`");
    }
}

// ============================================================================
// Swarm Orchestrator
// ============================================================================

export class SwarmOrchestrator {
    private logger: Logger;
    private parser: ManifestParser;
    private stateManager: StateManager;
    private issueTracker: GitHubIssueTracker;
    private agentPool: AgentPool;
    private executor: TaskExecutor;

    constructor(private options: OrchestratorOptions) {
        this.logger = new Logger(options.verbose);
        this.parser = new ManifestParser(this.logger);
        this.stateManager = new StateManager(this.logger);
        this.issueTracker = new GitHubIssueTracker(this.logger);
        this.agentPool = new AgentPool(this.logger);
        this.executor = new TaskExecutor(
            this.logger,
            this.issueTracker,
            this.stateManager,
            this.agentPool
        );
    }

    async run() {
        this.logger.info("🚀 Swarm Orchestrator Starting");

        try {
            // Load remote agents first (unless explicitly local-only)
            if (!this.options.local) {
                await this.agentPool.loadAgents();

                const agentCount = this.agentPool.getHealthyAgentCount();
                if (agentCount > 0) {
                    this.logger.info(
                        `Mode: Distributed (${agentCount} agents available)`
                    );
                } else {
                    this.logger.warning(
                        "No healthy agents found, falling back to local mode"
                    );
                    this.options.local = true;
                }
            }

            if (this.options.local) {
                this.logger.info(`Mode: Local Sequential`);
            }

            this.logger.info(`Verbose: ${this.options.verbose ? "ON" : "OFF"}`);

            // Parse manifest
            const manifest = this.parser.parse(this.options.manifestPath);

            // Load or initialize state
            let state = this.options.resume ? this.stateManager.loadState() : null;

            if (state) {
                this.logger.info(`Resuming from previous state`);
            } else {
                state = this.stateManager.initState(
                    this.options.manifestPath,
                    manifest.name,
                    manifest.base_branch,
                    manifest.tasks
                );
            }

            if (this.options.dryRun) {
                this.logger.info("DRY RUN MODE - No tasks will be executed");
                this.printExecutionPlan(manifest, state);
                return;
            }

            // Execute tasks
            await this.executeTasks(manifest, state);

            // Generate final report
            this.generateReport(manifest, state);

            this.logger.success("🎉 Swarm execution completed!");
        } catch (error) {
            this.logger.error(`Swarm execution failed: ${error}`);
            process.exit(1);
        }
    }

    private async executeTasks(manifest: WorkManifest, state: SwarmState) {
        const agentCount = this.agentPool.getHealthyAgentCount();
        const useRemote = !this.options.local && agentCount > 0;

        if (useRemote) {
            this.logger.info(
                `Executing ${manifest.tasks.length} tasks in PARALLEL mode across ${agentCount} agents`
            );
            await this.executeTasksParallel(manifest, state);
        } else {
            this.logger.info(
                `Executing ${manifest.tasks.length} tasks in sequential mode (local)`
            );
            await this.executeTasksSequential(manifest, state);
        }
    }

    private async executeTasksParallel(manifest: WorkManifest, state: SwarmState) {
        // Create task queue with all pending tasks
        const taskQueue: Task[] = manifest.tasks.filter(
            (task) => state.tasks[task.id]?.status !== "completed"
        );

        // Track active tasks: Map<task_id, Promise>
        const activeTasks = new Map<string, Promise<void>>();

        // Process queue until all tasks complete
        while (taskQueue.length > 0 || activeTasks.size > 0) {
            // Find tasks ready to execute (dependencies met)
            const readyTasks = taskQueue.filter((task) => {
                if (state.tasks[task.id]?.status === "completed") return false;

                if (task.depends_on && task.depends_on.length > 0) {
                    const unmetDeps = task.depends_on.filter(
                        (depId) => state.tasks[depId]?.status !== "completed"
                    );
                    return unmetDeps.length === 0;
                }

                return true; // No dependencies
            });

            // Assign ready tasks to available agents
            for (const task of readyTasks) {
                if (activeTasks.has(task.id)) continue; // Already running

                const agent = await this.agentPool.getAvailableAgent();
                if (!agent) break; // No agents available, wait

                // Remove from queue
                const index = taskQueue.indexOf(task);
                if (index > -1) taskQueue.splice(index, 1);

                // Start task execution (don't await - run in parallel)
                const taskPromise = this.executeTaskOnAgent(
                    task,
                    agent,
                    state,
                    manifest.base_branch
                ).then(() => {
                    // Task completed, remove from active
                    activeTasks.delete(task.id);
                    this.logger.info(
                        `Progress: ${this.getCompletedCount(state)}/${manifest.tasks.length} tasks completed`
                    );
                });

                activeTasks.set(task.id, taskPromise);
            }

            // Wait a bit before checking again
            if (activeTasks.size > 0) {
                await Promise.race(activeTasks.values());
            } else if (taskQueue.length > 0) {
                // Tasks in queue but none ready (blocked on dependencies)
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
    }

    private async executeTaskOnAgent(
        task: Task,
        agent: AgentConfig,
        state: SwarmState,
        baseBranch: string
    ): Promise<void> {
        const success = await this.executor.executeTask(
            task,
            state,
            baseBranch,
            true // useRemote
        );

        if (!success) {
            this.logger.warning(`Task ${task.id} failed on ${agent.name}`);
        }
    }

    private async executeTasksSequential(manifest: WorkManifest, state: SwarmState) {
        for (const task of manifest.tasks) {
            // Check if task already completed
            if (state.tasks[task.id]?.status === "completed") {
                this.logger.info(`Task ${task.id} already completed, skipping`);
                continue;
            }

            // Check dependencies
            if (task.depends_on && task.depends_on.length > 0) {
                const unmetDeps = task.depends_on.filter(
                    (depId) => state.tasks[depId]?.status !== "completed"
                );

                if (unmetDeps.length > 0) {
                    this.logger.warning(
                        `Task ${task.id} has unmet dependencies: ${unmetDeps.join(", ")}`
                    );

                    const depStatuses = task.depends_on.map((depId) => ({
                        id: depId,
                        status: state.tasks[depId]?.status || "unknown",
                    }));

                    await this.issueTracker.postDependencyWaiting(task.id, depStatuses);

                    this.stateManager.updateTaskState(state, task.id, {
                        status: "blocked",
                    });
                    continue;
                }
            }

            // Execute task
            const success = await this.executor.executeTask(
                task,
                state,
                manifest.base_branch,
                false // local execution
            );

            if (!success) {
                this.logger.warning(
                    `Task ${task.id} failed, continuing with remaining tasks`
                );
            }

            this.logger.info(
                `Progress: ${this.getCompletedCount(state)}/${manifest.tasks.length} tasks completed`
            );
        }
    }

    private getCompletedCount(state: SwarmState): number {
        return Object.values(state.tasks).filter((t) => t.status === "completed")
            .length;
    }

    private printExecutionPlan(manifest: WorkManifest, state: SwarmState) {
        console.log("\n" + "=".repeat(80));
        console.log("EXECUTION PLAN");
        console.log("=".repeat(80));
        console.log(`\nManifest: ${manifest.name}`);
        console.log(`Base Branch: ${manifest.base_branch}`);
        console.log(`Total Tasks: ${manifest.tasks.length}\n`);

        for (const task of manifest.tasks) {
            const status = state.tasks[task.id]?.status || "queued";
            console.log(`\n📋 Task ${task.id}`);
            console.log(`   Status: ${status}`);
            console.log(`   Branch: ${task.branch}`);
            console.log(`   Priority: ${task.priority || "medium"}`);
            if (task.depends_on && task.depends_on.length > 0) {
                console.log(`   Dependencies: ${task.depends_on.join(", ")}`);
            }
        }

        console.log("\n" + "=".repeat(80) + "\n");
    }

    private generateReport(manifest: WorkManifest, state: SwarmState) {
        const reportDir = path.join(process.cwd(), ".swarm", "reports");
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().split("T")[0];
        const reportFile = path.join(
            reportDir,
            `${timestamp}-${manifest.name.toLowerCase().replace(/\s+/g, "-")}.md`
        );

        const completed = Object.values(state.tasks).filter(
            (t) => t.status === "completed"
        ).length;
        const failed = Object.values(state.tasks).filter(
            (t) => t.status === "failed"
        ).length;
        const blocked = Object.values(state.tasks).filter(
            (t) => t.status === "blocked"
        ).length;

        let report = `# Swarm Execution Report\n\n`;
        report += `**Manifest:** ${manifest.name}\n`;
        report += `**Started:** ${state.started_at}\n`;
        report += `**Completed:** ${new Date().toISOString()}\n\n`;
        report += `## Summary\n\n`;
        report += `- Total Tasks: ${manifest.tasks.length}\n`;
        report += `- ✅ Completed: ${completed}\n`;
        report += `- ❌ Failed: ${failed}\n`;
        report += `- 🚫 Blocked: ${blocked}\n\n`;
        report += `## Task Details\n\n`;

        for (const task of manifest.tasks) {
            const taskState = state.tasks[task.id];
            report += `### Task ${task.id}\n\n`;
            report += `- **Status:** ${taskState.status}\n`;
            report += `- **Branch:** ${taskState.branch}\n`;
            if (taskState.pr_url) {
                report += `- **PR:** [#${taskState.pr_number}](${taskState.pr_url})\n`;
            }
            if (taskState.duration_minutes) {
                report += `- **Duration:** ${taskState.duration_minutes} minutes\n`;
            }
            if (taskState.error) {
                report += `- **Error:** ${taskState.error}\n`;
            }
            report += `\n`;
        }

        fs.writeFileSync(reportFile, report);
        this.logger.success(`Report generated: ${reportFile}`);
    }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

function printUsage() {
    console.log(`
Swarm Orchestrator - Distributed Task Execution

Usage:
  swarm <manifest.yaml> [options]

Options:
  --local         Run tasks sequentially on local machine (default: use remote agents)
  --verbose       Enable verbose logging
  --resume        Resume from previous state
  --dry-run       Show execution plan without running tasks
  --help          Show this help message

Examples:
  swarm work.yaml                    # Use remote agents (distributed)
  swarm work.yaml --local            # Force local execution
  swarm sprint-47.yaml --verbose     # Distributed with verbose logging
  swarm work.yaml --dry-run
  swarm work.yaml --resume
`);
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes("--help")) {
        printUsage();
        process.exit(0);
    }

    const manifestPath = args.find((arg) => !arg.startsWith("--"));
    if (!manifestPath) {
        console.error("Error: Manifest file required");
        printUsage();
        process.exit(1);
    }

    const options: OrchestratorOptions = {
        manifestPath: path.resolve(manifestPath),
        local: args.includes("--local"), // Default to distributed mode
        verbose: args.includes("--verbose"),
        resume: args.includes("--resume"),
        dryRun: args.includes("--dry-run"),
    };

    const orchestrator = new SwarmOrchestrator(options);
    await orchestrator.run();
}

if (require.main === module) {
    main().catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
}
