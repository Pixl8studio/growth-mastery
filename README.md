# Genie v3

The next generation of the Genie AI platform, built with modern TypeScript patterns and
enterprise-grade tooling.

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

### Development

- `pnpm dev` - Start development server
- `pnpm dev:turbo` - Start development server with Turbo mode (faster)
- `pnpm build` - Build for production
- `pnpm build:analyze` - Build with bundle size analysis
- `pnpm start` - Start production server
- `pnpm start:prod` - Start production server with NODE_ENV=production

### Code Quality

- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Run ESLint and auto-fix issues
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting without modifying
- `pnpm type-check` - Run TypeScript compiler checks
- `pnpm type-check:watch` - Run TypeScript checks in watch mode

### Testing

- `pnpm test` - Run unit tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:ui` - Open Vitest UI for interactive testing
- `pnpm test:e2e` - Run end-to-end tests with Playwright
- `pnpm test:e2e:ui` - Run E2E tests with Playwright UI
- `pnpm test:e2e:debug` - Debug E2E tests
- `pnpm test:e2e:headed` - Run E2E tests in headed mode (visible browser)

### Pre-Push Validation

- `pnpm pre-push` - Run full validation suite (lint, format, type-check, tests)
- `pnpm pre-push:checks` - Run all quality checks in parallel
- `pnpm pre-push:test` - Run test suite with coverage

### Utilities

- `pnpm clean` - Clean build artifacts and cache
- `pnpm clean:all` - Deep clean including node_modules

## Architecture Principles

Following patterns from mcp-hubby and lessons learned from v1/v2:

1. **Type Safety** - Comprehensive TypeScript usage
2. **Structured Logging** - Pino logger with context
3. **Error Handling** - Typed errors with proper boundaries
4. **Testing** - Vitest for unit tests, Playwright for e2e
5. **Code Quality** - ESLint, Prettier, and pre-commit hooks

## Git Hooks & Quality Gates

This project uses Husky for automated quality checks:

### Pre-Commit Hook

Runs automatically before every commit:

- ✨ **Lint-Staged** - Auto-fixes and formats only staged files
- 🔍 **ESLint** - Fixes linting issues
- ✨ **Prettier** - Formats code consistently
- ⚡ **Fast** - Only processes changed files (2-5 seconds)

### Pre-Push Hook

Runs automatically before every push:

- 🔎 **ESLint** - Full codebase linting
- ✨ **Prettier** - Format checking
- 🔧 **TypeScript** - Type checking
- 🧪 **Tests** - Full test suite with coverage
- ⏱️ **Comprehensive** - Full validation (30-60 seconds)

### CI/CD Pipeline

GitHub Actions runs on every PR and push to main:

- **Job 1: Code Quality** - Lint, format, type-check (parallel)
- **Job 2: Tests & Coverage** - Full test suite with Codecov integration
- **Job 3: Production Build** - Next.js build verification

## Testing Strategy

### Unit Tests (Vitest)

- Located in `__tests__/unit/`
- Run with `pnpm test`
- Coverage reports in `coverage/`
- Testing Library for React components

### E2E Tests (Playwright)

- Located in `__tests__/e2e/`
- Run with `pnpm test:e2e`
- Browser automation and visual testing
- Auto-starts dev server

### Coverage Requirements

- Aim for 80%+ coverage on critical paths
- Coverage reports uploaded to Codecov
- View reports locally in `coverage/index.html`

## Next Steps

1. Set up core application structure
2. Define data models and schemas
3. Implement authentication layer
4. Build feature modules
5. Add observability and monitoring

---

Built with precision and deductive reasoning. 🔍

## 🎯 Quick Start

This project is now live with full CI/CD! Every commit and push is validated
automatically.

### Try It Out

```bash
pnpm install  # Sets up git hooks
pnpm dev      # Start developing
```

🔍 Elementary! The tooling is operational.
