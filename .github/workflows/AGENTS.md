# GitHub Actions Workflows

CI/CD pipeline definitions. Changes here affect all PRs and deployments.

## Workflows

- `build.yml` - Main CI: lint, type-check, test, build
- `claude.yml` - Claude Code automation
- `claude-code-review.yml` - AI code review on PRs

## Constraints

- Secrets are managed in GitHub Settings, not committed
- Use `pnpm` not `npm` in all workflow steps
- Node version must match `engines.node` in package.json (22.0.0)
- Always run `pnpm install --frozen-lockfile` in CI

@.cursor/rules/fixing-github-actions-builds.mdc
