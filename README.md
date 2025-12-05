# Genie v3

The next generation of the Genie AI platform, built with modern TypeScript patterns and
enterprise-grade tooling.

> **🚀 Migration Status**: **75% Complete - APPLICATION FULLY FUNCTIONAL!**
>
> - ✅ **Phase 1**: Foundation (database, config, utilities)
> - ✅ **Phase 2**: Authentication (login, signup, settings)
> - ✅ **Phase 3**: External Services (OpenAI, VAPI, Gamma, Cloudflare, Stripe)
> - ✅ **Phase 4**: UI Components (25 components)
> - ✅ **Phase 5**: Core Pages (dashboard, project management)
> - ✅ **Phase 6**: All 11 Funnel Steps (complete wizard)
> - ✅ **Phase 7**: Public Pages (registration, watch, enrollment)
> - ✅ **Phase 8**: API Integration (AI generation, contacts, analytics) ⭐ NEW!
> - ⏳ **Phase 9-11**: Testing, docs, optimization (25% remaining)
> - 📝 See [Current Status](./docs/CURRENT_STATUS.md) for complete details

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp env.example .env.local
# Edit .env.local with your credentials

# 3. Run database migrations (if using local Supabase)
# supabase db push

# 4. Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### External Services Setup

The application integrates with several external services:

- **Supabase** - Database and authentication (required)
- **Stripe Connect** - Payment processing with platform fees (required for payments)
  - See [docs/STRIPE_SETUP.md](./docs/STRIPE_SETUP.md) for complete setup guide
- **OpenAI** - AI content generation (optional)
- **VAPI** - AI voice calls (optional)
- **Gamma** - Presentation generation (optional)
- **Cloudflare Stream** - Video hosting (optional)

See `env.example` for all configuration options.

## Overview

This is a clean v2 → v3 migration leveraging lessons learned from:

- **genie-v1** (webinar-deck) - Slide deck generation capabilities
- **genie-v2** (original genie) - Funnel builder application
- **mcp-hubby** - Latest tooling and patterns

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
- **Cursor Bugbot** - Automatic PR reviews
- **Claude Code** - AI-powered code reviews and assistance

The AI will automatically reference these rules when working in this codebase.

### Cursor Bugbot Integration

Cursor Bugbot automatically reviews every pull request:

```bash
# Check Bugbot installation status
./scripts/check-bugbot.sh

# Manual trigger on PR (comment)
cursor review

# Verbose mode for debugging
cursor review verbose=true
```

**Quick Setup:**

1. Install: https://github.com/apps/cursor-bugbot
2. Enable at: https://cursor.com/dashboard

See [docs/BUGBOT_QUICKSTART.md](./docs/BUGBOT_QUICKSTART.md) for setup.

### Claude Code Integration

Claude Code is integrated for intelligent code reviews:

```bash
pnpm claude:review          # Review your code changes
pnpm claude:chat            # Interactive AI chat about your code
pnpm claude                 # Launch full CLI
```

### Dual AI Review System

| Tool              | Trigger                            | Best For                  |
| ----------------- | ---------------------------------- | ------------------------- |
| **Cursor Bugbot** | Automatic on every PR              | Quick bug detection       |
| **Claude Code**   | Manual (`@claude` or pnpm scripts) | Deep architectural review |

## Project Structure

```
genie-v3/
├── .cursor/
│   ├── rules/           # AI coding standards and patterns
│   └── bugbot.json      # Cursor Bugbot configuration
├── .claude/commands/    # Claude Code automation commands
├── app/                 # Next.js 15 App Router
├── components/          # React components
├── lib/                 # Shared utilities
├── docs/                # Documentation
│   ├── BUGBOT_QUICKSTART.md
│   └── CURSOR_BUGBOT_SETUP.md
├── scripts/             # Utility scripts
│   └── check-bugbot.sh
└── public/              # Static assets
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

### AI Code Review

- `pnpm claude` - Launch Claude Code CLI
- `pnpm claude:review` - Get AI code review
- `pnpm claude:chat` - Start interactive AI chat

### Utilities

- `pnpm clean` - Clean build artifacts and cache
- `pnpm clean:all` - Deep clean including node_modules
- `./scripts/check-bugbot.sh` - Verify Cursor Bugbot installation

## Database Schema

### Core Funnel Builder Tables

The application uses Supabase (PostgreSQL) for data storage with the following core
tables:

- `user_profiles` - User accounts and settings
- `funnel_projects` - Webinar funnel projects
- `vapi_transcripts` - AI call transcriptions
- `offers` - Product/service offers
- `deck_structures` - Slide deck structures
- `gamma_decks` - Generated Gamma presentations
- `enrollment_pages` - Purchase/booking pages
- `talk_tracks` - Webinar scripts
- `pitch_videos` - Video content
- `watch_pages` - Video viewing pages
- `registration_pages` - Signup pages
- `funnel_flows` - Complete funnel configurations
- `contacts` - Prospect/customer contacts
- `contact_events` - Engagement tracking
- `funnel_analytics` - Analytics data
- `webhook_logs` - Webhook delivery logs
- `payment_transactions` - Stripe payments
- `stripe_accounts` - Stripe Connect accounts

### AI Follow-Up Engine (GitHub Issue #23)

**Status**: Data schema complete ✅ (Sub-Issue #1)

The AI Follow-Up Engine adds intelligent, personalized post-webinar follow-up
automation:

**Core Tables**:

- `followup_agent_configs` - AI agent configuration and knowledge base
- `followup_prospects` - Prospect tracking and engagement data
- `followup_sequences` - Message sequence definitions
- `followup_messages` - Individual message templates
- `followup_deliveries` - Actual message sends and tracking
- `followup_events` - Prospect engagement event stream
- `followup_intent_scores` - Intent scoring history
- `followup_story_library` - Proof/story content library
- `followup_experiments` - A/B testing and experimentation

**Key Features**:

- 5-segment prospect categorization (No-Show, Skimmer, Sampler, Engaged, Hot)
- Token-based message personalization
- Intent scoring based on engagement
- Multi-channel orchestration (Email + SMS)
- Automated sequence triggering
- A/B testing framework
- Compliance and opt-out management

See
[migrations/20250126000001_ai_followup_schema.sql](./supabase/migrations/20250126000001_ai_followup_schema.sql)
for complete schema details.

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

---

_Deployment test - 2025-11-12 - Vercel auto-deployment working with growth-mastery
repository ✅_

---

<!-- Every line of code is a step toward something greater. Keep building, keep learning, and remember: the best software is created by those who believe in the impact of their work. Your dedication today shapes tomorrow's possibilities. -->
