# Developer Onboarding Guide

Get up to speed with Project Destiny development.

## First Day Checklist

### 1. Prerequisites

Ensure you have installed:
- **Node.js** (v20+) - [Download](https://nodejs.org/)
- **pnpm** (v10+) - `npm install -g pnpm`
- **Git** - For version control
- **VS Code** (recommended) - With extensions:
  - ESLint
  - Prettier
  - TypeScript

### 2. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd project_destiny

# Install dependencies
pnpm install

# Verify installation
pnpm dev
```

### 3. First Build

```bash
# Type check
pnpm typecheck

# Run linter
pnpm lint

# Run tests
pnpm test:run

# Build
pnpm build
```

### 4. Explore the Codebase

Start with these files:
- `CLAUDE.md` - Project workflow and commands
- `docs/architecture.md` - Clean architecture overview
- `docs/engineering-standards.md` - Coding standards
- `src/application/store/gameSlice.ts` - Redux store setup
- `src/ui/App.tsx` - Main UI entry point

---

## Project Structure

```
project_destiny/
├── src/
│   ├── domain/           # Pure game rules (no framework deps)
│   │   ├── combat/       # Combat contracts
│   │   ├── events/       # Event contracts
│   │   ├── game/         # GameState schema
│   │   ├── inventory/    # Inventory contracts
│   │   ├── npc/          # NPC contracts
│   │   ├── quests/       # Quest contracts
│   │   └── ...
│   ├── application/      # Orchestration layer
│   │   ├── commands/     # State transformers
│   │   ├── selectors/    # Memoized selectors
│   │   ├── content/      # Content catalog
│   │   └── store/        # Redux slice
│   ├── infrastructure/   # Adapters and persistence
│   │   └── persistence/  # Save game handling
│   └── ui/               # React components
│       ├── screens/      # Screen components
│       └── components/   # Shared UI components
├── data/
│   ├── definitions/      # JSON content definitions
│   └── runtime/          # Runtime data
├── docs/                 # Documentation
└── .beads/              # Issue tracking (Dolt)
```

---

## Development Workflow

### 1. Finding Work

```bash
# See available issues
bd ready

# View issue details
bd show <id>

# Claim an issue
bd update <id> --claim
```

### 2. Making Changes

```bash
# Create feature branch (optional, worktree recommended)
git checkout -b feature/your-feature-name

# Make changes
# ... edit files ...

# Run checks
pnpm typecheck
pnpm lint
pnpm test:run
```

### 3. Committing

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: add new feature"
# or
git commit -m "fix: resolve bug"
# or
git commit -m "docs: update documentation"
```

### 4. Testing

**Run all tests:**
```bash
pnpm test:run
```

**Run specific test file:**
```bash
pnpm exec vitest run src/application/commands/myCommand.test.ts
```

**Run playthrough tests:**
```bash
pnpm test:playthrough:golden
```

**Watch mode:**
```bash
pnpm test
```

---

## Architecture Overview

### Clean Architecture

```
UI → Application → Domain
Infrastructure → Application → Domain
```

**Rules:**
- Domain has NO dependencies on UI, Infrastructure, or framework APIs
- Application depends only on Domain
- UI and Infrastructure depend on Application
- Dependencies point INWARD

### Command Pattern

Commands are pure state transformers:

```typescript
export function myCommand(state: GameState, params: Params): GameState {
  // Validate guards
  if (!passesGuards(state)) return state

  // Compute new state (immutable)
  const newState = { ...state, /* changes */ }

  // Optionally log activity
  return appendActivityLogEntry(newState, 'category', 'message')
}
```

### File Organization

**Domain (`src/domain/`):**
- `contracts.ts` - Zod schemas and inferred types
- Pure game rules
- No external dependencies

**Application (`src/application/`):**
- `commands/` - State transformers
- `selectors/` - Memoized Redux selectors
- `content/` - Content catalog

**UI (`src/ui/`):**
- Components use `useAppSelector` for data
- Components use `useAppDispatch` for actions
- NO business logic in components

---

## Common Tasks

### Adding a New Command

1. Create `src/application/commands/myCommand.ts`:
```typescript
export function myCommand(state: GameState, params: Params): GameState {
  // Implementation
}
```

2. Write tests in `src/application/commands/myCommand.test.ts`:
```typescript
describe('myCommand', () => {
  it('does something', () => {
    // Test
  })
})
```

3. Add reducer to `src/application/store/gameSlice.ts`:
```typescript
case 'myCommand':
  return myCommand(snapshot, action.payload)
```

### Adding Content Definition

1. Add to appropriate JSON file in `data/definitions/`:
```json
{
  "id": "my-new-item",
  "name": "New Item",
  ...
}
```

2. Schema validation happens automatically at load time

### Adding a Screen

1. Create component in `src/ui/screens/MyScreen.tsx`:
```typescript
export function MyScreen() {
  const data = useAppSelector(selectData)
  const dispatch = useAppDispatch()

  return <div>{/* UI */}</div>
}
```

2. Add route in `src/ui/App.tsx`:
```typescript
<Route path="/my-screen" element={<MyScreen />} />
```

---

## Debugging

### Common Issues

**Type errors:**
```bash
pnpm typecheck
```

**Lint errors:**
```bash
pnpm lint
pnpm format  # Auto-fix some issues
```

**Test failures:**
```bash
pnpm test:run
pnpm test  # Watch mode with better output
```

**Build fails:**
```bash
pnpm build
```

### Using the Debugger

1. Set breakpoints in VS Code
2. Run dev server: `pnpm dev`
3. Open Chrome DevTools (usually at http://localhost:5173)

---

## Key Concepts

### GameState

Central state object. All mutations go through commands:

```typescript
// Read state
const state = useAppSelector(selectGameState)

// Mutate state via command
dispatch(gameSlice.actions.myCommand({ param: 'value' }))
```

### Content Catalog

Static content definitions loaded at startup:

```typescript
import { contentCatalog } from '@/application/content/contentCatalog'

const itemDef = contentCatalog.getItem('item-id')
```

### Activity Log

Player feedback mechanism:

```typescript
appendActivityLogEntry(state, 'combat', 'Enemy defeated')
```

---

## Resources

### Documentation

- [Architecture](../architecture.md)
- [Engineering Standards](../engineering-standards.md)
- [Command API Reference](./commands.md)
- [GameState Data Dictionary](./game-state.md)
- [Testing Strategy](./testing-strategy.md)

### Workflow Docs

- [Agent Operating Model](../agent-operating-model.md)
- [Bead Creation](../workflows/bead-creation.md)
- [Task Contract](../task-contract.md)

### Content

- [Authoring Guide](../authoring-guide.md)
- [Narrative](../narrative.md)
- [Product](../product.md)

---

## Getting Help

1. Check existing documentation first
2. Search existing Beads for similar work
3. Ask in team chat with specific context
4. Reference relevant code files in questions

---

## Quick Reference

### Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | Type checking |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm test:run` | Run all tests |
| `pnpm test` | Watch mode |
| `bd ready` | Find available work |
| `bd show <id>` | View issue |
| `bd update <id> --claim` | Claim issue |
| `bd close <id>` | Close issue |

### Git Conventions

```bash
# Branch naming
feature/descriptive-name
fix/descriptive-name
docs/descriptive-name

# Commit messages
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: code restructure
test: add tests
chore: maintenance
```
