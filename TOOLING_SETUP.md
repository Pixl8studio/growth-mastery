# Genie v3 Tooling Setup

## 🎉 Overview

This document describes the comprehensive development tooling setup inspired by
**mcp-hubby** (thanks Nick!). The setup provides production-ready quality gates,
automated testing, and CI/CD integration.

## 🛠️ What's Included

### 1. Git Hooks with Husky

**Pre-Commit Hook** (`.husky/pre-commit`)

- Runs `lint-staged` on staged files only
- Auto-fixes ESLint issues
- Auto-formats with Prettier
- Fast: 2-5 seconds

**Pre-Push Hook** (`.husky/pre-push`)

- Full codebase linting
- Format checking
- TypeScript type checking
- Complete test suite with coverage
- Comprehensive: 30-60 seconds

### 2. Package Scripts

#### Development

- `pnpm dev` - Standard dev server
- `pnpm dev:turbo` - Turbo mode (faster hot reload)
- `pnpm build` - Production build
- `pnpm build:analyze` - Bundle analysis

#### Quality Checks

- `pnpm lint` / `pnpm lint:fix` - ESLint
- `pnpm format` / `pnpm format:check` - Prettier
- `pnpm type-check` / `pnpm type-check:watch` - TypeScript

#### Testing

- `pnpm test` - Unit tests
- `pnpm test:watch` - Watch mode
- `pnpm test:coverage` - Coverage report
- `pnpm test:ui` - Visual test UI
- `pnpm test:e2e` - End-to-end tests
- `pnpm test:e2e:ui` - E2E with UI
- `pnpm test:e2e:debug` - Debug E2E
- `pnpm test:e2e:headed` - Visible browser

#### Pre-Push Validation

- `pnpm pre-push` - Full validation suite
- `pnpm pre-push:checks` - Parallel quality checks
- `pnpm pre-push:test` - Coverage testing

### 3. Testing Infrastructure

**Vitest** (Unit/Integration Tests)

- 4-core parallel execution
- JSDOM environment for React
- V8 coverage provider
- Testing Library integration
- Located in `__tests__/unit/`

**Playwright** (E2E Tests)

- Browser automation
- Auto-starts dev server
- Retry logic for flaky tests
- Visual debugging tools
- Located in `__tests__/e2e/`

### 4. Configuration Files

#### Code Quality

- `eslint.config.mjs` - ESLint with Next.js + TypeScript
- `.prettierrc` - Prettier with file-specific rules
- `.prettierignore` - Ignore patterns
- `tsconfig.json` - Strict TypeScript config

#### Testing

- `vitest.config.mts` - Vitest configuration
- `vitest.setup.ts` - Test environment setup
- `playwright.config.ts` - E2E test config

#### Package Management

- `.pnpmrc` - pnpm optimizations
- `.nvmrc` - Node version pinning
- `package.json` - Scripts + dependencies + lint-staged

#### Styling

- `tailwind.config.ts` - Tailwind CSS config
- `postcss.config.mjs` - PostCSS config

### 5. GitHub Actions CI/CD

**Workflow: `.github/workflows/build.yml`**

Three parallel jobs:

1. **Code Quality** (5 min timeout)
   - ESLint
   - Prettier format check
   - TypeScript type check

2. **Tests & Coverage** (5 min timeout)
   - Full test suite
   - Coverage reports
   - Codecov integration
   - Coverage artifacts

3. **Production Build** (5 min timeout)
   - Next.js build
   - Build cache restoration
   - Build verification
   - Build artifacts

Triggers:

- Pull requests to main
- Pushes to main
- Manual workflow dispatch

### 6. Lint-Staged Configuration

Automatically processes staged files:

```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

## 🚀 Getting Started

### Initial Setup

```bash
# Install dependencies (this also runs Husky setup via 'prepare' script)
pnpm install

# Git hooks are now active!
```

### Development Workflow

```bash
# Start development
pnpm dev

# Make changes...

# Stage files
git add .

# Commit (pre-commit hook runs automatically)
git commit -m "feat: add new feature"

# Push (pre-push hook runs automatically)
git push
```

### Manual Validation

Run the same checks that pre-push runs:

```bash
# Full validation suite
pnpm pre-push

# Or run checks individually
pnpm lint
pnpm format:check
pnpm type-check
pnpm test:coverage
```

## 📊 Quality Metrics

### Coverage Goals

- Unit test coverage: 80%+ on critical paths
- Coverage reports: `coverage/index.html`
- CI uploads to Codecov

### Code Quality

- ESLint: Warn on unused vars, any types
- Prettier: 88 char width, 4 space indent
- TypeScript: Strict mode enabled

### Performance

- Pre-commit: 2-5 seconds (staged files only)
- Pre-push: 30-60 seconds (full validation)
- CI pipeline: ~5 minutes (3 parallel jobs)

## 🎓 Learning Resources

### Key Dependencies

**Development Tools**

- `husky` - Git hooks manager
- `lint-staged` - Run linters on staged files
- `npm-run-all2` - Run scripts in parallel/series

**Testing**

- `vitest` - Unit test framework
- `@testing-library/react` - React testing utilities
- `@playwright/test` - E2E testing framework

**Code Quality**

- `eslint` - Linting
- `prettier` - Formatting
- `typescript` - Type checking

**Build Tools**

- `tailwindcss` - Utility-first CSS
- `autoprefixer` - CSS vendor prefixing
- `postcss` - CSS transformation

## 🔧 Customization

### Adjusting Hooks

Edit `.husky/pre-commit` or `.husky/pre-push` to customize behavior.

### Modifying Lint-Staged

Edit the `lint-staged` section in `package.json`.

### Test Configuration

- Unit tests: `vitest.config.mts`
- E2E tests: `playwright.config.ts`
- Test setup: `vitest.setup.ts`

### CI/CD Pipeline

Edit `.github/workflows/build.yml` to add/modify jobs.

## 🎯 Best Practices

1. **Commit Often** - Pre-commit runs fast on small changesets
2. **Fix Issues Early** - Don't bypass hooks (they save time!)
3. **Run Pre-Push Locally** - Test before pushing to avoid CI failures
4. **Monitor Coverage** - Keep coverage trending up
5. **Use Test UI** - `pnpm test:ui` for interactive debugging

## 🙏 Credits

This tooling setup is heavily inspired by **Nick's mcp-hubby repository**, which
demonstrates production-ready development practices. Thank you for the excellent
example!

## 📝 Next Steps

1. Install dependencies: `pnpm install`
2. Try a commit to see pre-commit in action
3. Run `pnpm test` to verify test setup
4. Push to see pre-push validation
5. Create a PR to see CI/CD in action

---

Built with precision, tested thoroughly, and ready for production. 🔍✨
