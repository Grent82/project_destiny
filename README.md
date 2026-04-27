# Project Destiny

Project Destiny is a browser-based systems RPG under active agentic development.

## Stack

- React
- TypeScript
- Vite
- Redux Toolkit
- Zod
- Vitest

See [ADR 0001](./docs/decisions/0001-initial-stack-and-quality-gates.md) for the current toolchain decision.

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

## Validation

```bash
pnpm lint
pnpm test:run
pnpm typecheck
pnpm build
```

## Architecture

See:

- [Product](./docs/product.md)
- [Architecture](./docs/architecture.md)
- [Engineering Standards](./docs/engineering-standards.md)
- [Agent Operating Model](./docs/agent-operating-model.md)
