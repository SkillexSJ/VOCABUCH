# Development Guide

## Workflow Guidelines

1. **Package Management**: Always use `pnpm`.
2. **Local Services**: Run `docker compose -f infrastructure/docker-compose.yml up -d` for PostgreSQL.
3. **Quality Checks**: Run `pnpm typecheck` and `pnpm build` before committing changes.
