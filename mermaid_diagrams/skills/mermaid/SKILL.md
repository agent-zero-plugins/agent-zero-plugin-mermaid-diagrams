---
name: mermaid
version: 1.0.0
description: "Guide to creating Mermaid diagrams for visual explanations in chat"
author: "Omar Nahhas"
tags: [mermaid, diagrams, visualization, flowchart, sequence-diagram]
triggers:
  - mermaid
  - diagram
  - flowchart
  - visualize
  - draw
  - show me
  - sequence diagram
---

# Mermaid Diagrams Skill

Create diagrams using Mermaid syntax in fenced code blocks. The chat UI automatically renders them as interactive SVGs.

## Output Format

Always wrap Mermaid code in a fenced code block with the `mermaid` language identifier:

````
```mermaid
graph TD
    A[Start] --> B[End]
```
````

## Diagram Type Selection Guide

| User wants to understand... | Use this diagram type |
|---|---|
| A process, workflow, or decision tree | **Flowchart** |
| How components interact over time | **Sequence Diagram** |
| Object/class structure and relationships | **Class Diagram** |
| States and transitions of a system | **State Diagram** |
| Database tables and relationships | **ER Diagram** |
| Project schedule and timeline | **Gantt Chart** |
| Proportions or distribution | **Pie Chart** |
| Brainstorming or topic hierarchy | **Mindmap** |
| Chronological events | **Timeline** |
| Git branching strategy | **Git Graph** |

## Syntax Reference

### Flowchart

Use for processes, workflows, algorithms, decision trees.

```mermaid
flowchart TD
    A[Start] --> B{Decision?}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
```

Node shapes:
- `[text]` — rectangle
- `(text)` — rounded rectangle
- `{text}` — diamond (decision)
- `([text])` — stadium/pill
- `[[text]]` — subroutine
- `[(text)]` — cylinder (database)
- `((text))` — circle
- `>text]` — flag/asymmetric

Directions: `TD` (top-down), `LR` (left-right), `BT` (bottom-top), `RL` (right-left)

Edge styles:
- `-->` solid arrow
- `-.->` dotted arrow
- `==>` thick arrow
- `-->|label|` labeled arrow
- `---` solid line (no arrow)

Subgraphs:
```mermaid
flowchart TD
    subgraph Frontend
        A[React App] --> B[API Client]
    end
    subgraph Backend
        C[REST API] --> D[(Database)]
    end
    B --> C
```

### Sequence Diagram

Use for API interactions, service communication, protocol flows.

```mermaid
sequenceDiagram
    participant U as User
    participant S as Server
    participant DB as Database

    U->>S: POST /login
    activate S
    S->>DB: Query user
    DB-->>S: User record
    alt Valid credentials
        S-->>U: 200 OK + token
    else Invalid
        S-->>U: 401 Unauthorized
    end
    deactivate S
```

Arrow types:
- `->>` solid arrow (synchronous)
- `-->>` dashed arrow (response/async)
- `-x` solid with X (lost message)
- `-)` solid arrow (async, open)

Features: `activate`/`deactivate`, `alt`/`else`/`end`, `loop`/`end`, `opt`/`end`, `par`/`and`/`end`, `Note over A,B: text`

### Class Diagram

Use for object models, type hierarchies, API structures.

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() void
    }
    class Dog {
        +fetch() void
    }
    class Cat {
        +purr() void
    }
    Animal <|-- Dog
    Animal <|-- Cat
```

Relationships:
- `<|--` inheritance
- `*--` composition
- `o--` aggregation
- `-->` association
- `..>` dependency
- `<..` realization

### State Diagram

Use for state machines, lifecycle flows, status transitions.

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: Submit
    Processing --> Success: Complete
    Processing --> Error: Fail
    Error --> Idle: Retry
    Success --> [*]
```

Features: `[*]` for start/end states, `state Fork <<fork>>`, composite states with `state Name { ... }`

### ER Diagram

Use for database schemas, data models, entity relationships.

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "is in"

    USER {
        int id PK
        string email UK
        string name
    }
    ORDER {
        int id PK
        int user_id FK
        date created_at
    }
```

Cardinality: `||` exactly one, `o|` zero or one, `}|` one or more, `}o` zero or more

### Gantt Chart

Use for project timelines, sprint planning, task scheduling.

```mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Design
        Wireframes       :done, d1, 2024-01-01, 7d
        UI Mockups       :active, d2, after d1, 5d
    section Development
        Backend API      :d3, after d2, 14d
        Frontend         :d4, after d2, 14d
    section Testing
        QA               :d5, after d3, 7d
```

Task states: `done`, `active`, `crit` (critical path)

### Pie Chart

Use for proportions, distributions, simple breakdowns.

```mermaid
pie title Traffic Sources
    "Organic Search" : 45
    "Direct" : 25
    "Social Media" : 20
    "Referral" : 10
```

### Mindmap

Use for brainstorming, topic hierarchies, concept exploration.

```mermaid
mindmap
    root((Project))
        Frontend
            React
            TypeScript
            Tailwind
        Backend
            Python
            FastAPI
            PostgreSQL
        DevOps
            Docker
            CI/CD
            Monitoring
```

### Timeline

Use for chronological events, version history, milestones.

```mermaid
timeline
    title Release History
    2023-Q1 : v1.0 Launch
            : Core features
    2023-Q2 : v1.1 Update
            : Performance improvements
    2023-Q3 : v2.0 Major Release
            : New architecture
```

### Git Graph

Use for branching strategies, merge workflows, release flows.

```mermaid
gitGraph
    commit id: "init"
    branch develop
    commit id: "feat-1"
    branch feature/auth
    commit id: "auth-1"
    commit id: "auth-2"
    checkout develop
    merge feature/auth
    checkout main
    merge develop tag: "v1.0"
```

## Best Practices

1. **Keep it simple** — Limit nodes to 15-20 per diagram. Split complex systems into multiple diagrams.
2. **Label edges** — Always label arrows to explain the relationship or data flow.
3. **Use meaningful IDs** — Use descriptive node IDs (`AuthService` not `A1`).
4. **Choose direction wisely** — Use `TD` for hierarchies, `LR` for processes/timelines.
5. **Use subgraphs** — Group related nodes to improve readability.
6. **One concept per diagram** — Don't try to show everything at once.
7. **Test syntax** — Mermaid is whitespace-sensitive. Avoid special characters in labels without quotes.
8. **Quote labels with special chars** — Use `["Label with (parens)"]` for labels containing special characters.

## Common Pitfalls

- **Semicolons**: Not needed at end of lines
- **Special characters in labels**: Wrap in quotes `["my label: value"]`
- **Empty lines**: Avoid empty lines inside diagram blocks
- **Case sensitivity**: Keywords like `graph`, `subgraph`, `end` are case-insensitive but node IDs are case-sensitive
- **Duplicate IDs**: Each node ID must be unique within a diagram
