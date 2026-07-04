# mermaid-diagrams — E2E behaviour, in BDD

Behaviour contract. The render trigger is a `code.language-mermaid` block in the chat (what A0 emits for a
```mermaid fence); the steps inject that block directly (no LLM). Rendering needs the CDN `mermaid` lib.

## Hard rules
1. Behaviour, not implementation. 2. No fake green. 3. Real trigger (a rendered mermaid block).
4. ≤10 grouped features, one trace each.

## Feature: Rendering mermaid diagrams  *(group 01)*
```gherkin
Scenario: A mermaid diagram in the chat is rendered   # BEH-1
  Given I am in a chat
  When a mermaid diagram is posted in the chat
  Then it is rendered as a diagram

Scenario: An invalid diagram shows an error, not a crash   # BEH-2
  Given I am in a chat
  When an invalid mermaid diagram is posted in the chat
  Then an error is shown for it and the chat keeps working
```

## Tracked skips
```gherkin
@interaction  BEH-3  zoom overlay on click  -> depends on a rendered SVG being clickable + overlay geometry; tracked, exercised manually
