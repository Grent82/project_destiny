# Cross-System Interaction Diagrams

Visual documentation of how Project Destiny systems interact.

## Architecture Overview

```mermaid
graph TB
    subgraph UI Layer
        UI[React Components]
        SEL[Redux Selectors]
        DISP[Redux Dispatch]
    end

    subgraph Application Layer
        CMD[Commands]
        CAT[Content Catalog]
        SLI[Game Slice Reducers]
    end

    subgraph Domain Layer
        GS[GameState]
        COM[Combat]
        EVT[Events]
        QST[Quests]
        NPC[NPC]
        INV[Inventory]
        FAC[Factions]
    end

    subgraph Infrastructure
        SAV[Save System]
        RNG[RNG Service]
    end

    UI --> SEL
    UI --> DISP
    SEL --> CAT
    SEL --> GS
    DISP --> SLI
    SLI --> CMD
    CMD --> GS
    CMD --> CAT
    CMD --> COM
    CMD --> EVT
    CMD --> QST
    CMD --> NPC
    CMD --> INV
    CMD --> FAC
    SAV --> GS
    RNG --> CMD
```

---

## EndDay Orchestration

The `endDay` command orchestrates 15 simulation phases:

```mermaid
sequenceDiagram
    participant Player
    participant UI
    participant endDay
    participant Phases
    participant GameState

    Player->>UI: Click "End Day"
    UI->>endDay: endDay(state)
    Note over endDay: Phase 1: WAGES
    endDay->>Phases: handleWagesPhase()
    Phases-->>GameState: Update wages, loyalty
    Note over endDay: Phase 2: DECAY
    endDay->>Phases: handleDecayPhase()
    Phases-->>GameState: Apply state decay
    Note over endDay: Phase 3: CORRIDOR
    endDay->>Phases: handleCorridorPhase()
    Phases-->>GameState: Supply chain
    Note over endDay: Phase 4: RESOURCES
    endDay->>Phases: handleResourcesPhase()
    Phases-->>GameState: City consequences
    Note over endDay: Phase 5: CONSEQUENCES
    endDay->>Phases: handleConsequencesPhase()
    Phases-->>GameState: Relationship drift
    Note over endDay: Phase 6: TIME_ADVANCE
    endDay->>Phases: handleTimeAdvancePhase()
    Phases-->>GameState: Day++, repairs
    Note over endDay: Phase 7: POLITICS
    endDay->>Phases: handlePoliticsPhase()
    Phases-->>GameState: Faction dynamics
    Note over endDay: Phase 8: EVENTS
    endDay->>Phases: handleEventsPhase()
    Phases-->>GameState: Event lifecycle
    Note over endDay: Phase 9: SOCIAL_SIM
    endDay->>Phases: handleSocialSimulationPhase()
    Phases-->>GameState: World NPC sim
    Note over endDay: Phase 10: PERSONALITY
    endDay->>Phases: handlePersonalityPhase()
    Phases-->>GameState: Trait drift
    Note over endDay: Phase 11: PAIRING
    endDay->>Phases: handlePairingPhase()
    Phases-->>GameState: NPC intimacy
    Note over endDay: Phase 12: BONDING
    endDay->>Phases: handleBondingPhase()
    Phases-->>GameState: Legacy, pregnancy
    Note over endDay: Phase 13: CAPTIVITY
    endDay->>Phases: handleCaptivityPhase()
    Phases-->>GameState: Degradation
    Note over endDay: Phase 14: QUESTS
    endDay->>Phases: handleQuestsPhase()
    Phases-->>GameState: Quest expiry
    Note over endDay: Phase 15: DIRECTIVES
    endDay->>Phases: handleFactionDirectivesPhase()
    Phases-->>GameState: New directives
    Phases-->>GameState: Advance RNG seed
    GameState-->>UI: New state
    UI->>Player: Show results
```

---

## Combat Encounter Flow

```mermaid
graph TD
    A[Player Triggers Combat] --> B[startCombatEncounter]
    B --> C[Build Combatants]
    C --> D[Load Enemy Table]
    D --> E[Initialize activeCombat]
    E --> F[UI: Combat Screen]

    F --> G{Player Action}
    G -->|Attack| H[performCombatAction]
    G -->|Defend| H
    G -->|Guard| H

    H --> I[Resolve Player Turn]
    I --> J[Resolve Enemy Turns]
    J --> K[Update Durabilities]
    K --> L{Combat Ended?}
    L -->|No| F
    L -->|Yes| M[concludeCombatEncounter]

    M --> N[Calculate Outcome]
    N --> O[Apply Loot]
    O --> P[Update Relationships]
    P --> Q[Settle Quests]
    Q --> R[Clear activeCombat]
    R --> S[UI: Return to District]
```

---

## Event System Flow

```mermaid
sequenceDiagram
    participant endDay
    participant evaluateEvents
    participant EventDB
    participant GameState
    participant UI

    endDay->>evaluateEvents: handleEventsPhase()
    evaluateEvents->>EventDB: Query eligible events
    EventDB-->>evaluateEvents: Filtered events
    Note over evaluateEvents: Check trigger conditions
    evaluateEvents->>GameState: Create pendingEvent
    GameState-->>UI: Event available

    UI->>evaluateEvents: Player chooses option
    evaluateEvents->>evaluateEvents: applyEventOutcome()
    Note over evaluateEvents: Apply all outcomes
    evaluateEvents->>GameState: Update state
    GameState-->>UI: Refresh UI
    evaluateEvents->>EventDB: Log eventInstance
```

---

## Quest Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Available
    Available --> LeadFound: addQuestLeadIfNew
    LeadFound --> Active: acceptQuestFromLead
    Active --> OnSite: advanceToOnSiteStep
    OnSite --> Pressured: Time threshold
    Pressured --> Engaged: Player advances
    Engaged --> Resolving: Combat/Investigation complete
    Resolving --> Completed: settleQuestSuccess
    Resolving --> Failed: settleQuestFailure
    Completed --> [*]: Successor quest created
    Failed --> [*]: Failure handling
    Active --> [*]: Abandoned
```

---

## Inventory System Flow

```mermaid
graph LR
    subgraph Player Inventory
        P1[Bag Containers]
        P2[Equipment Slots]
    end

    subgraph NPC Inventory
        N1[NPC Bags]
        N2[NPC Equipment]
    end

    subgraph Shared Containers
        S1[House Storage]
    end

    subgraph Commands
        C1[equipItem]
        C2[transferItem]
        C3[createContainer]
    end

    C1 --> P2
    C1 --> N2
    C2 --> P1
    C2 --> N1
    C2 --> S1
    C3 --> P1
    C3 --> S1
```

---

## Faction System Interaction

```mermaid
graph TB
    subgraph Faction State
        FS[FactionRuntimeState]
        FD[FactionDirectives]
        FP[PoliticalDials]
    end

    subgraph Triggers
        T1[EndDay Politics Phase]
        T2[Quest Completion]
        T3[Event Outcomes]
        T4[Player Actions]
    end

    subgraph Effects
        E1[Standing Changes]
        E2[City Dial Changes]
        E3[District Control]
        E4[Encounter Tables]
    end

    T1 --> FS
    T2 --> FS
    T3 --> FS
    T4 --> FS

    FS --> E1
    FS --> E2
    FS --> E3
    FS --> E4

    FD --> T1
```

---

## NPC Agency Cycle

```mermaid
sequenceDiagram
    participant endDay
    participant NPC
    participant State
    participant Intention

    endDay->>NPC: For each roster NPC
    Note over NPC: Generate Intention
    NPC->>Intention: calculateNpcIntention()
    Intention-->>NPC: Selected intention
    Note over NPC: Execute Intention
    NPC->>State: executeNpcIntention()
    State-->>NPC: Result
    Note over NPC: Apply consequences
    NPC->>State: updateNpcState()
```

---

## Save/Load Flow

```mermaid
sequenceDiagram
    participant UI
    participant SaveSystem
    participant Migration
    participant Validator
    participant Storage

    UI->>SaveSystem: saveGame()
    SaveSystem->>SaveSystem: current(state)
    SaveSystem->>Migration: migrate(v{N-1} -> vN)
    Migration->>Validator: validate(schema)
    Validator-->>Migration: Valid
    Migration-->>SaveSystem: Migrated state
    SaveSystem->>Storage: Write JSON
    Storage-->>SaveSystem: Success
    SaveSystem-->>UI: Save complete

    UI->>SaveSystem: loadGame()
    Storage->>SaveSystem: Read JSON
    SaveSystem->>Migration: Migrate to latest
    Migration->>Validator: validate(schema)
    Validator-->>Migration: Valid
    Migration-->>SaveSystem: Migrated state
    SaveSystem-->>UI: State loaded
```

---

## Relationship System

```mermaid
graph TD
    subgraph Relationship Axes
        A1[affinity]
        A2[respect]
        A3[fear]
        A4[trust]
        A5[loyalty]
    end

    subgraph Modifiers
        M1[Proximity]
        M2[Gifts]
        M3[Conversations]
        M4[Intimacy]
        M5[Quests]
    end

    subgraph Outcomes
        O1[Romance Arc]
        O2[NPC Departure]
        O3[Bond Formation]
        O4[Trait Drift]
    end

    M1 --> A1
    M2 --> A1
    M2 --> A4
    M3 --> A1
    M3 --> A4
    M4 --> A1
    M4 --> A2
    M5 --> A2
    M5 --> A5

    A1 --> O1
    A2 --> O1
    A5 --> O2
    A4 --> O3
    A1 --> O4
```

---

## City Resource System

```mermaid
graph TB
    subgraph Resources
        R1[foodSecurity]
        R2[foodStock]
        R3[waterAccess]
        R4[materialStock]
        R5[corridorStatus]
    end

    subgraph Daily Changes
        D1[applyFoodConsumption]
        D2[applyFoodProduction]
        D3[applyCorridorImport]
        D4[houseRepairs]
    end

    subgraph Consequences
        C1[Unrest Events]
        C2[NPC Departure]
        C3[Encounter Difficulty]
        C4[Shop Availability]
    end

    D1 --> R2
    D2 --> R2
    D3 --> R2
    D3 --> R5
    D4 --> R4

    R1 --> C1
    R2 --> C1
    R5 --> C2
    R5 --> C3
    R4 --> C4
```

---

## System Dependencies

```mermaid
graph LR
    subgraph Core
        GS[GameState]
    end

    subgraph Combat
        C1[Combat]
        C2[Equipment]
        C3[Encounter Tables]
    end

    subgraph Social
        S1[NPC]
        S2[Relationships]
        S3[Dialogue]
    end

    subgraph Economy
        E1[Inventory]
        E2[Wages]
        E3[Shops]
    end

    subgraph World
        W1[Factions]
        W2[Districts]
        W3[Events]
        W4[Quests]
    end

    C1 --> GS
    C2 --> GS
    S1 --> GS
    S2 --> GS
    E1 --> GS
    E2 --> GS
    W1 --> GS
    W2 --> GS
    W3 --> GS
    W4 --> GS

    C1 --> C2
    C1 --> C3
    S1 --> S2
    S2 --> S3
    E1 --> E3
    W1 --> W2
    W3 --> W4
```

---

## Data Flow Summary

| System | Primary State | Read By | Written By |
|--------|---------------|---------|------------|
| Combat | `activeCombat` | Combat UI, Commands | `startCombatEncounter`, `concludeCombatEncounter` |
| Inventory | `inventoryState` | All UI, Commands | `equipItem`, `transferItem` |
| Relationships | `relationships` | Social UI, Commands | `applyRelationshipDelta`, `courtNpc` |
| Quests | `activeQuests` | Quest UI, Commands | Quest lifecycle commands |
| Factions | `factionStandings` | All systems | `applyFactionActivity`, Event outcomes |
| Events | `pendingEvents`, `eventInstances` | Event UI, Commands | `evaluateEvents`, `applyEventOutcome` |
| NPCs | `roster`, `worldNpcStates` | All systems | `recruitNpc`, `dismissNpc`, Agency |
| Resources | `cityResources` | Resource UI, Commands | `applyFoodConsumption`, `applyCorridorImport` |

---

## See Also

- [Command API Reference](./commands.md) - All state transformers
- [GameState Data Dictionary](./game-state.md) - Complete state structure
- [Event System Documentation](./events.md) - Event details
- [Testing Strategy](./testing-strategy.md) - How to test interactions
