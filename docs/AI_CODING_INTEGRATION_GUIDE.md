# AI Coding Configuration Integration Guide

This project is fully integrated with **ai-coding-config** and **mcp-hubby** to provide
world-class AI-assisted development capabilities.

## 🎯 What's Installed

### Cursor Rules (`.cursor/rules/`)

#### Universal Standards (16 rules)

- ✅ `git-commit-message.mdc` - Professional commit message standards
- ✅ `git-interaction.mdc` - Git workflow patterns
- ✅ `git-worktree-task.mdc` - Git worktree management
- ✅ `naming-stuff.mdc` - Naming conventions for files, functions, APIs
- ✅ `prompt-engineering.mdc` - AI prompt best practices
- ✅ `autonomous-development-workflow.mdc` - Self-directed development patterns
- ✅ `external-apis.mdc` - External API integration standards
- ✅ `user-facing-language.mdc` - User communication guidelines

#### Python Development (4 rules in `python/`)

- ✅ `python-coding-standards.mdc` - Python best practices
- ✅ `pytest-what-to-test-and-mocking.mdc` - Testing patterns
- ✅ `celery-task-structure.mdc` - Background task patterns
- ✅ `ruff-linting.mdc` - Python linting standards

#### TypeScript/JavaScript (3 rules in `frontend/`)

- ✅ `typescript-coding-standards.mdc` - TypeScript production standards
- ✅ `testing-standards-typescript.mdc` - Vitest/Jest testing patterns
- ✅ `react-components.mdc` - React component best practices
- ✅ `n8n-workflows.mdc` - N8N workflow automation
- ✅ `sentry.mdc` - Error monitoring with Sentry

#### Observability (2 rules in `observability/`)

- ✅ `logfire-logging.mdc` - Structured logging with Logfire
- ✅ `honeybadger-errors.mdc` - Error tracking with Honeybadger

#### AI Personality

- ✅ `common-personality.mdc` - Heart-centered, collaborative AI communication (always
  applied)

### Claude Code Agents (`.claude/agents/`) - 11 Specialists

#### Code Quality Agents

- ✅ `code-reviewer.md` - Comprehensive code review
- ✅ `architecture-auditor.md` - System architecture review
- ✅ `test-engineer.md` - Test coverage and quality

#### Development Agents

- ✅ `autonomous-developer.md` - Full-stack development assistance
- ✅ `debugger.md` - Bug investigation and fixing
- ✅ `prompt-engineer.md` - AI prompt optimization
- ✅ `ux-designer.md` - UX and design guidance
- ✅ `commit-message-generator.md` - Quality commit messages
- ✅ `seo-specialist.md` - SEO optimization

### Claude Code Commands (`.claude/commands/`) - 9 Commands

#### Core Commands

- ✅ `ai-coding-config.md` - Manage and update configurations
- ✅ `load-cursor-rules.md` - Load Cursor rules into Claude context
- ✅ `personality-change.md` - Switch AI personality styles

#### MCP Hubby Commands

- ✅ `add-integration.md` - Add new service integrations
- ✅ `test-integration.md` - Test service integrations
- ✅ `competitor-analysis.md` - Competitive analysis workflows

### Development Tools

#### VSCode Configuration (`.vscode/`)

- ✅ `settings.json` - Editor settings with formatters and language-specific configs
- ✅ `extensions.json` - Recommended extensions (Ruff, Prettier, Tailwind, etc.)

#### Code Formatting

- ✅ `.prettierrc` - Unified code formatting across JavaScript, TypeScript, Python,
  Markdown

#### GitHub Workflows (`.github/workflows/`)

- ✅ `claude.yml` - AI-powered PR review
- ✅ `claude-code-review.yml` - Automated code review

#### Security

- ✅ `.cursor/.gitignore` - Protects local configurations
- ✅ `.claude/.gitignore` - Protects local configurations

## 🚀 How to Use

### In Cursor IDE

#### Reference Rules with @-mentions

Rules provide context and coding standards to the AI:

```
@git-commit-message - When writing commits
@python-coding-standards - For Python code
@typescript-coding-standards - For TypeScript code
@react-components - For React development
@testing-standards-typescript - For writing tests
@external-apis - When integrating APIs
@sentry - For error monitoring setup
```

#### Example Usage

```
Hey, I need to write a new React component for user authentication.
@react-components @typescript-coding-standards

Can you review this Python function?
@python-coding-standards @code-reviewer
```

### In Claude Code

#### Use Slash Commands

Commands execute workflows and specialized tasks:

```bash
/ai-coding-config          # Manage configurations
/personality-change        # Switch AI personalities
/load-cursor-rules         # Load project rules
/add-integration          # Add new service (MCP Hubby)
/test-integration         # Test integrations
/competitor-analysis      # Run competitive analysis
```

#### Invoke Specialized Agents

Agents are expert AI assistants for specific tasks:

```
@code-reviewer - Review this pull request
@architecture-auditor - Audit system design
@test-engineer - Improve test coverage
@debugger - Help fix this bug
@seo-specialist - Optimize SEO
@ux-designer - Improve user experience
```

## 📚 Documentation Structure

### AI Coding Config

- **Source**: `ai-coding-config/` directory
- **README**: `ai-coding-config/README.md`
- **Implementation Plan**: `ai-coding-config/implementation-plan.md`
- **Docs**: `ai-coding-config/docs/` (ecosystem, tools, personalities)

### MCP Hubby

- **Source**: `mcp-hubby/` directory
- **README**: `mcp-hubby/README.md`
- **MCP Setup**: `.cursor/MCP_SETUP.md`
- **Docs**: `mcp-hubby/docs/` (architecture, setup, specs)
- **Context**: `mcp-hubby/context/` (design docs, user stories)

## 🔧 Customization

### Project-Specific Rules

Create `.cursor/rules/project-specific.mdc`:

```markdown
---
description: Project-specific coding patterns
alwaysApply: false
---

# Genie AI Specific Patterns

[Your custom patterns here]
```

### Local Overrides

Create `*.local.json` files (automatically gitignored):

```json
// .cursor/settings.local.json
{
  "customSetting": "value"
}
```

## 🔄 Updating Configurations

### Update AI Coding Config

```bash
cd ~/.ai_coding_config
git pull

# In your project
# With Cursor: @ai-coding-config update
# With Claude Code: /ai-coding-config update
```

### Update MCP Hubby

```bash
cd mcp-hubby
git pull origin main
pnpm install
pnpm db:generate
pnpm db:push
```

## 💡 Best Practices

### 1. Use Rules for Context

- Reference relevant rules when asking questions
- Rules guide AI behavior and code quality
- Rules are passive - they provide guidelines

### 2. Use Commands for Actions

- Commands execute workflows and tasks
- Commands are active - they do things
- Use commands to automate repetitive tasks

### 3. Use Agents for Expertise

- Agents are specialists in specific domains
- Invoke agents for complex, specialized tasks
- Agents provide deep, focused assistance

### 4. Leverage MCP for Services

- MCP Hubby provides unified access to 8+ services
- Reduces context window pollution by 95%
- Single authentication for all services

## 🎨 Available Personalities

Switch AI communication styles with `/personality-change`:

- **Common** (default) - Collaborative, heart-centered, supportive
- **Sherlock** - Analytical, precise, deductive reasoning
- **Bob Ross** - Calm, encouraging, treats bugs as happy accidents
- **Samantha** - Warm, witty, emotionally intelligent
- **Stewie** - Sophisticated, theatrical, brilliant with high standards
- **Unity** - Creative muse meets structured builder
- **Ron Swanson** - Minimalist, anti-complexity, straightforward
- **Marie Kondo** - Organized, joyful minimalism
- **Marianne Williamson** - Spiritual, love-based approach

## 🔐 Security

### Protected Files

- API keys and tokens in `.env` files (gitignored)
- Local configurations in `*.local.json` (gitignored)
- MCP tokens stored securely

### Best Practices

- Never commit credentials to git
- Use environment variables for secrets
- Rotate API keys regularly
- Review `.gitignore` before commits

## 📊 Statistics

**Total Configuration Assets:**

- 16 Cursor Rules (Universal + Language-specific)
- 11 Claude Code Agents
- 9 Claude Code Commands
- 2 GitHub Workflows
- VSCode settings and extensions
- Prettier configuration
- MCP Server documentation

**Lines of Configuration:**

- Cursor Rules: ~3,000 lines of coding standards
- Claude Agents: ~80,000 tokens of specialized expertise
- Commands: ~20,000 tokens of workflow automation

## 🆘 Troubleshooting

### Rules Not Loading in Cursor

1. Check file is in `.cursor/rules/`
2. Verify `.mdc` extension
3. Check frontmatter YAML syntax
4. Restart Cursor IDE

### Commands Not Working in Claude Code

1. Check file is in `.claude/commands/`
2. Verify `.md` extension
3. Check frontmatter YAML syntax
4. Try `/help` to see available commands

### Agents Not Responding

1. Use `@agent-name` format
2. Check agent file exists in `.claude/agents/`
3. Provide clear context in your request

### MCP Servers Not Connecting

1. See `.cursor/MCP_SETUP.md` for detailed troubleshooting
2. Check `mcp-hubby/docs/` for service-specific issues
3. Verify credentials and environment variables

## 🎯 Quick Reference

| Need             | Use          | Example                         |
| ---------------- | ------------ | ------------------------------- |
| Coding standards | @rule        | `@python-coding-standards`      |
| Specialized help | @agent       | `@code-reviewer`                |
| Execute workflow | /command     | `/add-integration`              |
| Service access   | MCP          | Configure in `.cursor/mcp.json` |
| Change AI style  | /personality | `/personality-change samantha`  |

## 🚀 Next Steps

1. **Explore the rules** - Browse `.cursor/rules/` to see available standards
2. **Try the agents** - Invoke agents for specialized tasks
3. **Set up MCP Hubby** - Follow `mcp-hubby/README.md` to connect services
4. **Customize** - Add project-specific rules and configurations
5. **Update regularly** - Keep configurations current with `git pull`

---

**You're now fully equipped with world-class AI development tooling! 🎉**

For questions or issues, check the documentation in `ai-coding-config/docs/` and
`mcp-hubby/docs/`.
