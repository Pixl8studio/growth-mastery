# Genie v3

The next generation of the Genie AI platform, built with modern TypeScript patterns and enterprise-grade tooling.

## Overview

This is a fresh rebuild leveraging:
- **genie-v1** (webinar-deck) - Slide deck generation capabilities
- **genie-v2** (original genie) - MCP integration platform foundation
- **mcp-hubby** - Latest MCP tooling and patterns

## Development Setup

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 10.0.0

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## AI Coding Configuration

This project is configured with:

- **Sherlock personality** - Methodical, analytical development approach
- **TypeScript standards** - Production-ready coding patterns
- **React/Next.js patterns** - Modern component architecture
- **Git workflows** - Commit message standards and automation
- **Observability** - Structured logging and error monitoring

The AI will automatically reference these rules when working in this codebase.

## Project Structure

```
genie-v3/
├── .cursor/rules/        # AI coding standards and patterns
├── .claude/commands/     # Claude Code automation commands
├── app/                  # Next.js app directory (to be created)
├── components/           # React components (to be created)
├── lib/                  # Shared utilities (to be created)
└── public/               # Static assets (to be created)
```

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript compiler checks
- `pnpm test` - Run tests
- `pnpm format` - Format code with Prettier

## Architecture Principles

Following patterns from mcp-hubby and lessons learned from v1/v2:

1. **Type Safety** - Comprehensive TypeScript usage
2. **Structured Logging** - Pino logger with context
3. **Error Handling** - Typed errors with proper boundaries
4. **Testing** - Vitest for unit tests, Playwright for e2e
5. **Code Quality** - ESLint, Prettier, and pre-commit hooks

## Next Steps

1. Set up core application structure
2. Define data models and schemas
3. Implement authentication layer
4. Build feature modules
5. Add observability and monitoring

---

Built with precision and deductive reasoning. 🔍
