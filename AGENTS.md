# Project Context for AI Assistants

## Always Apply Rules

Core project rules that apply to all tasks:

@.cursor/rules/heart-centered-ai-philosophy.mdc
@.cursor/rules/trust-and-decision-making.mdc
@.cursor/rules/git-interaction.mdc
@.cursor/rules/frontend/typescript-coding-standards.mdc
@.cursor/rules/personalities/luminous.mdc

## Project Overview

Genie v3 - AI-powered webinar funnel builder platform. Users create funnels through a
multi-step wizard that generates registration, watch, and enrollment pages using AI.

## Tech Stack

- Next.js 16.0.7 with App Router
- React 19.2.0
- TypeScript 5.9.3 (strict mode)
- Supabase for database + auth (PostgreSQL with RLS)
- Vitest for unit tests, Playwright for E2E
- pnpm 10.18.0 (Node 22+)

## Project Structure

- `app/` - Next.js App Router pages and API routes
- `components/` - React components (includes ai-editor/ for landing page builder)
- `lib/` - Shared utilities, services, AI integrations
- `__tests__/unit/` - Unit tests (colocated pattern NOT used)
- `__tests__/e2e/` - Playwright E2E tests
- `supabase/migrations/` - Database migrations (auto-generated, never edit manually)

## Code Conventions

DO:
- Use pnpm not npm (lockfile compatibility)
- Place tests in `__tests__/unit/` directory, not alongside source files
- Use Supabase RLS policies for all table security
- Follow emoji commit prefixes (see git log for examples)

DON'T:
- Never manually create/edit migration files - use `supabase db diff`
- Never skip git hooks with `--no-verify`
- Never use `npm` commands - always `pnpm`

## Git Workflow

Commit format uses emoji prefixes:
- `feat:` or `Add` for new features
- `fix:` or `🐛` for bug fixes
- `🔒` for security updates
- `🔧` for configuration changes

Pre-commit: lint-staged auto-fixes staged files
Pre-push: full validation suite (lint, type-check, tests)

## Important Notes

- AI Editor (Phase 4): Version history DB exists but UI not implemented yet
- Supabase types: Run `pnpm db:types` after schema changes
- External services: Stripe Connect, VAPI, Gamma, Cloudflare Stream, OpenAI
- Rate limiting via Upstash Redis on API routes
