# Architecture

## Purpose

This document defines the initial architecture for Project Destiny so multiple agents can implement features without inventing incompatible structures.

The architecture is optimized for:

- clean dependency direction
- strong testability
- content scalability
- incremental delivery
- TDD-first domain work

This document intentionally defines boundaries before concrete framework wiring. The initial stack and quality-gate choice is recorded in [ADR 0001](./decisions/0001-initial-stack-and-quality-gates.md). The hybrid world-site contract for abstract and concrete locations is recorded in [ADR 0002](./decisions/0002-hybrid-location-simulation-contract.md).

## Architectural Goals

- Keep business rules independent from rendering and persistence.
- Make core game behavior runnable and testable without the browser UI.
- Support data-driven content growth without central rewrite pressure.
- Minimize overlapping write scopes between agents.
- Make vertical slices possible without collapsing boundaries.

## Architectural Style

Project Destiny uses a clean architecture with four logical layers:

1. `Domain`
2. `Application`
3. `Infrastructure`
4. `UI`

Dependency direction always flows inward.

```text
UI -> Application -> Domain
Infrastructure -> Application -> Domain
```

Domain must not depend on UI, storage, browser APIs, or framework internals.

## Layer Definitions

### Domain

The domain layer contains the game rules and invariant-bearing models.

Responsibilities:

- entities
- value objects
- state transition rules
- combat rules
- relationship rules
- event eligibility policies
- validation of domain invariants

Properties:

- pure or near-pure logic
- deterministic behavior where possible
- no framework dependencies
- no persistence concerns

Examples:

- `Npc`
- `Relationship`
- `WeaponProfile`
- `CombatRound`
- `PoliticalDials`
- `AssignmentPolicy`

### Application

The application layer orchestrates use cases by coordinating domain objects and ports.

Responsibilities:

- use cases
- command handlers
- query handlers
- transaction boundaries at the logical level
- coordination of repositories, clocks, RNG, and persistence ports

Properties:

- may depend on domain
- may define ports used by infrastructure
- should remain testable with fakes or in-memory adapters

Examples:

- `AdvanceDay`
- `AssignNpcToTitle`
- `StartMission`
- `ResolveCombatEncounter`
- `PurchaseItem`

### Infrastructure

The infrastructure layer implements application ports and technical adapters.

Responsibilities:

- serialization
- local persistence
- data loading
- random source adapters
- clock adapters
- content repositories
- save-game storage

Properties:

- may depend on application and domain
- may use framework or platform APIs
- must not own game rules

Examples:

- local save adapter
- JSON content loader
- browser storage adapter
- deterministic RNG adapter for testing

### UI

The UI layer renders the game and handles user interaction.

Responsibilities:

- screens
- components
- navigation
- view models
- interaction wiring
- user feedback

Properties:

- may depend on application and read-only domain contracts
- must not implement business rules directly
- should delegate mutations through application-level commands or actions

Examples:

- roster screen
- NPC detail panel
- district map view
- combat screen

## Module Boundaries

The preferred codebase structure is:

```text
src/
  domain/
    npc/
    relationships/
    combat/
    economy/
    factions/
    items/
    shared/
  application/
    use-cases/
    ports/
    services/
    queries/
  infrastructure/
    persistence/
    content/
    random/
    time/
  ui/
    app/
    screens/
    components/
    view-models/
  test/
    builders/
    fakes/
```

Feature-oriented folders may exist inside `ui/`, but core rule ownership stays in `domain/` and `application/`.

## Domain Modeling Rules

### Rule 1: separate definitions from runtime state

Immutable content definitions and mutable runtime state must not be conflated.

Examples:

- weapon definitions belong in content
- an equipped weapon with durability loss belongs in runtime state
- faction definitions belong in content
- current faction standing belongs in runtime state

### Rule 2: prefer explicit value objects

Use typed concepts for bounded values and domain meaning instead of anonymous primitives when the meaning matters.

Examples:

- relationship axes
- range state
- durability
- faction standing
- political dial values

### Rule 3: keep calculations close to the owning concept

Combat calculations should live with combat modules. Relationship transitions should live with relationship modules. Avoid giant cross-domain utility files.

### Rule 4: domain APIs should be deterministic when inputs are fixed

### Rule 5: locations must share one runtime substrate

Player-house rooms, world households, room-capable POIs, occupancy, and captivity must not evolve as separate architectural species.

The project adopts a hybrid location model:

- abstract site runtime for offscreen simulation
- concrete site runtime for entered or currently relevant places

See [ADR 0002](./decisions/0002-hybrid-location-simulation-contract.md).

Randomness should be injected through a port or passed as an explicit dependency so domain behavior remains testable.

## Application Layer Rules

### Use cases are the write boundary

State-changing operations should be expressed as application use cases, not scattered UI event logic.

Examples:

- `assignNpcToJob`
- `advanceDay`
- `buyFromShop`
- `equipItem`
- `startCombat`

### Queries should stay separate from mutations

Read models, selectors, and projections should not secretly mutate runtime state.

### Ports must isolate side effects

The application layer defines interfaces for:

- persistence
- content access
- time
- randomness
- logging or telemetry if needed later

This keeps testing straightforward and avoids browser lock-in.

## State Management Constraints

### Single source of mutable game state

At runtime, there should be one authoritative game-state aggregate per loaded save.

UI-local state may exist for:

- modal visibility
- hover and selection state
- transient filters
- draft input values

But gameplay truth should not be duplicated between UI stores and domain models.

### Domain-first state transitions

Gameplay state transitions should be expressed in domain and application layers first. The UI should trigger them, not define them.

### Persistable state boundary

Everything required to resume the game should live in a serializable runtime-state model independent of the UI framework.

## Persistence Boundaries

The initial persistence approach should be local-first.

Architecture requirements:

- save format is explicit and versionable
- serialization logic is isolated in infrastructure
- domain models do not know about storage format
- content definitions and save-state instances are stored separately

The save boundary must at least include:

- current in-game time
- player resources
- roster runtime state
- equipment durability
- district state
- faction standing
- political dials
- active events or quests

## Content Architecture

Project Destiny is content-heavy, so content must be data-driven from the start.

### Content principles

- content files define base data
- schemas validate content before use
- runtime state references content by stable IDs
- content loading should be replaceable without touching domain rules

### Expected content families

- NPC definitions
- item definitions
- weapon definitions
- armor definitions
- district definitions
- faction definitions
- title definitions
- quest definitions
- event definitions

## Testing Strategy

### Testing pyramid

Project Destiny should bias heavily toward domain and application tests.

Priority order:

1. unit tests for domain behavior
2. use-case tests for application flows
3. adapter tests for infrastructure boundaries
4. UI tests for critical interaction paths

### TDD expectations

TDD is mandatory for new domain and application behavior unless an explicit exception is recorded in the active Bead.

Default loop:

1. write a failing test
2. implement the smallest change
3. refactor under green tests

### What must have direct tests

- combat math
- range transitions
- equipment effects
- relationship transitions
- trait or state effects
- assignment resolution
- daily tick processing
- persistence invariants

### Test support structure

The test suite should include:

- domain builders
- in-memory repositories
- fake clocks
- fake RNGs
- fixture loaders for content

These belong in dedicated test support modules, not scattered ad hoc through features.

## Module Ownership and Agent Boundaries

The initial ownership model is:

- `Architect`: `docs/*`, interface contracts, architecture decisions
- `Systems`: `src/domain/*`, `src/application/*`
- `Data`: `data/*`, schemas, seed content
- `UI`: `src/ui/*`
- `Verifier`: review artifacts and tests when explicitly assigned

Shared files should be minimized. If a shared contract file must change, the coordinator should serialize that work through one active Bead.

## Naming and Packaging Conventions

- name modules by domain purpose, not technical pattern alone
- avoid generic folders like `utils` for rule-heavy logic
- prefer one concept per module family
- keep public module surfaces small and explicit
- avoid circular imports across domain submodules

## Acceptable Early Tradeoffs

Early implementation may:

- use in-memory adapters before permanent persistence is finalized
- use simple JSON content files before tooling is built
- use a minimal application shell before full navigation is mature

Early implementation may not:

- move business rules into UI for speed
- bypass use cases for gameplay mutations
- tie domain entities to browser APIs
- merge content definitions and runtime save-state

## Technical Decision Linkage

The concrete initial toolchain is defined in [ADR 0001](./decisions/0001-initial-stack-and-quality-gates.md).

That decision must comply with this architecture rather than redefine it.
