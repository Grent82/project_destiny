# Release Process

## Overview

This document describes the release process for Project Destiny, covering build configuration, save game versioning, testing requirements, and deployment procedures.

### Release Philosophy

- **Incremental Delivery**: Small, frequent releases with clear scope
- **Backward Compatibility**: Save game migrations ensure player progress is preserved across versions
- **Quality Gates**: Automated testing and type checking before any release
- **Deterministic Builds**: Reproducible builds via Vite and TypeScript configuration

## Release Cycles

### Current Version Status

- **Package Version**: `0.0.0` (pre-release/development phase)
- **Save Game Version**: `4` (current schema version)
- **Package Manager**: `pnpm@10.19.0`

### Version Types

| Version Type | Scope | Frequency |
|--------------|-------|-----------|
| Development | Local-only commits | Continuous |
| Pre-release | Feature-complete milestones | As needed |
| Major | Breaking changes to save schema | Rare |
| Minor | New features, backward-compatible migrations | Regular |
| Patch | Bug fixes, security updates | As needed |

## Save Game Versioning

### Schema Version Management

Save games use a `saveVersion` field (integer) to track schema evolution. The current version is **4**.

**Location**: `src/infrastructure/persistence/localSaveSnapshot.ts`

### Migration Pattern

Migrations follow a linear progression:

```
v0 (no version) → v1 → v2 → v3 → v4 (current)
```

Each migration step:
1. Detects the incoming version
2. Applies necessary transformations
3. Updates `saveVersion` to the next version
4. Validates against `gameStateSchema`

### Migration History

#### v0 → v1
**Changes**:
- Added `saveVersion` field
- Normalized `playerCharacter` to structured `attributes/skills/traits` shape

**Migration Logic**:
```typescript
// Adds default attribute/skill/trait values if not present
playerCharacter: {
  attributes: { might: 50, agility: 50, /* ... */ },
  skills: { melee: 30, ranged: 20, /* ... */ },
  traits: { discipline: 40, ambition: 60, /* ... */ }
}
```

#### v1 → v2
**Changes**:
- Legacy `ownedItems` system removed
- Version bump only (no data transformation)

#### v2 → v3
**Changes**:
- Added `chronicle` field for narrative tracking

**Migration Logic**:
```typescript
chronicle: createEmptyChronicle()
```

#### v3 → v4 (Current)
**Changes**:
- Added `foodStock` and `foodCapacity` to `cityResources`
- Food stock derived from existing `foodSecurity` percentage

**Migration Logic**:
```typescript
// foodSecurity = (foodStock / foodCapacity) * 100
// Therefore: foodStock = (foodSecurity / 100) * foodCapacity
foodStock: Math.round((foodSecurity / 100) * 1000)
foodCapacity: 1000
```

### Adding New Versions

When adding a new schema version:

1. **Update `gameStateSchema`** in `src/domain/game/contracts.ts`
2. **Add migration case** in `localSaveSnapshot.ts`:
   ```typescript
   if (version === 4) {
     // v4 → v5: your changes here
     return gameStateSchema.safeParse({ ...raw4, saveVersion: 5 }).data ?? null
   }
   ```
3. **Update initial game state** in `data/runtime/initial-game-state.json`:
   ```json
   {
     "saveVersion": 5,
     // new fields with defaults
   }
   ```
4. **Add tests** for the migration path
5. **Document** the migration in this file

### Breaking Changes

If a change cannot be migrated:
1. Increment the **major version** in `package.json`
2. Clear player saves on first load (with warning message)
3. Document the breaking change in the changelog

## Build Process

### Build Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | TypeScript compilation + Vite production build |
| `pnpm preview` | Preview production build locally |
| `pnpm typecheck` | Type checking without emitting |
| `pnpm lint` | ESLint validation |
| `pnpm format` | Prettier formatting |

### Build Configuration

**Vite** (`vite.config.ts`):
- Uses `@vitejs/plugin-react` for React fast refresh
- Test configuration via Vitest with Playwright browser support
- Storybook integration for component development

**TypeScript** (`tsconfig.app.json`):
- Target: ES2023
- Module: ESNext (bundler mode)
- Strict mode with `verbatimModuleSyntax`
- No unused locals/parameters

### Build Outputs

The Vite build produces:
- `dist/` directory containing:
  - `index.html` - Entry point
  - `assets/` - Bundled JS and CSS with content hashes
  - Static assets (images, fonts, etc.)

### Environment Variables

- `CODEX_DISABLE_STORYBOOK_PROJECT=1` - Disable Storybook test project
- `STORYBOOK_DISABLE_CHROMATIC=1` - Disable Chromatic integration

## Testing Before Release

### Required Test Runs

Run in order before any release:

```bash
# 1. Type checking
pnpm typecheck

# 2. Linting
pnpm lint

# 3. Unit tests (single pass)
pnpm test:run

# 4. Playthrough regression tests
pnpm test:playthrough:golden

# 5. Full playthrough suite (optional for minor releases)
pnpm test:playthrough:all

# 6. Build verification
pnpm build
```

### Test Categories

| Category | Command | Scope |
|----------|---------|-------|
| Unit tests | `pnpm test:run` | All `*.test.ts` files |
| Golden path | `pnpm test:playthrough:golden` | Canonical playthrough |
| Branch scenarios | `pnpm test:playthrough:branches` | Decision branches |
| Quest funnel | `pnpm test:playthrough:funnel` | Quest progression |
| Browser tests | `pnpm test:playthrough:browser` | UI integration |
| E2E tests | `pnpm test:e2e` | Playwright end-to-end |

### Pre-commit Hooks

The `simple-git-hooks` configuration runs type checking on every commit:

```json
"simple-git-hooks": {
  "pre-commit": "pnpm typecheck"
}
```

## Deployment

### Current Deployment Status

**No remote deployment configured.** The project is currently development-only with local-only commits.

### Deployment Steps (When Ready)

1. **Version bump** in `package.json`:
   ```bash
   # Patch release (bug fixes)
   pnpm version patch

   # Minor release (new features)
   pnpm version minor

   # Major release (breaking changes)
   pnpm version major
   ```

2. **Build verification**:
   ```bash
   pnpm build
   pnpm preview
   ```

3. **Create release tag**:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   ```

4. **Deploy** (platform-specific):
   - Vercel: `vercel deploy --prod`
   - Netlify: `netlify deploy --prod`
   - Custom: Upload `dist/` directory

### Build Artifacts

For manual deployment, archive the build output:
```bash
pnpm build
tar -czf project-destiny-v1.0.0.tar.gz dist/
```

## Changelog

### Format

Follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [1.0.0] - 2026-06-27

### Added
- New feature description

### Changed
- Behavior changes

### Deprecated
- Soon-to-be-removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements
```

### Categories

| Category | When to Use |
|----------|-------------|
| Added | New player-facing features |
| Changed | Modified behavior (non-breaking) |
| Deprecated | Features to be removed |
| Removed | Breaking changes |
| Fixed | Bug fixes |
| Security | Security patches |
| Schema | Save game migrations |

### Example Entry

```markdown
## [0.1.0] - 2026-06-27

### Added
- Arousal state system for NPC relationships
- Money-earning intention types
- Clothing and armor equip/unequip commands

### Changed
- Migrated save schema from v3 to v4
- Food stock now tracked explicitly vs derived

### Fixed
- Fixed wage payment calculation for retainers
```

## Rollback Procedures

### Save Game Rollback

If a release introduces critical bugs:

1. **Identify affected version** via `saveVersion`
2. **Hotfix release** with backward-compatible migration
3. **Document rollback** in changelog

### Client-Side Recovery

Players with corrupted saves:
1. Delete browser localStorage key: `project-destiny.save`
2. Start fresh game (loses progress)

**Note**: No cloud backup currently implemented.

### Version Rollback

To revert to a previous release:

```bash
# Checkout previous version
git checkout v0.9.0

# Rebuild
pnpm install
pnpm build

# Redeploy with previous build artifacts
```

## Quality Gates

### Release Readiness Checklist

- [ ] All tests passing (`pnpm test:run`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Golden path playthrough passes
- [ ] Save migrations tested for all version paths
- [ ] Changelog updated
- [ ] Documentation updated (if applicable)

### Post-Release Verification

- [ ] Verify build output in `dist/`
- [ ] Test with `pnpm preview` locally
- [ ] Run `pnpm test:playthrough:golden` on built version
- [ ] Verify save game loading with new schema

## Related Documentation

- [Architecture](../architecture.md) - System design and patterns
- [Engineering Standards](../engineering-standards.md) - Code quality requirements
- [Task Contract](../task-contract.md) - Task definition format
- [Domain Contracts](../../src/domain/game/contracts.ts) - GameState schema
