# Test Directory

All tests live here - NOT colocated with source files.

## Structure

- `unit/` - Vitest unit tests (fast, isolated)
- `e2e/` - Playwright browser tests
- `integration/` - API and database integration tests
- `helpers/` - Shared test utilities
- `setup.ts` - Global test configuration

## Conventions

- Mirror source structure: `lib/foo.ts` → `__tests__/unit/lib/foo.test.ts`
- Use real database with PGlite for integration tests, not mocks
- Mock external APIs (Stripe, OpenAI, VAPI) but not internal code
- Target 90% line / 85% branch coverage

@.cursor/rules/frontend/testing-standards-typescript.mdc
