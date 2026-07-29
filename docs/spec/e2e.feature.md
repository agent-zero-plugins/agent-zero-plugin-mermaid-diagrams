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

Scenario: A sequence diagram is rendered   # BEH-6
  Given I am in a chat
  When a sequence diagram is posted in the chat
  Then it is rendered as a diagram

Scenario: A state diagram is rendered   # BEH-6
  Given I am in a chat
  When a state diagram is posted in the chat
  Then it is rendered as a diagram

Scenario: Non-mermaid code blocks are left alone   # BEH-7
  Given I am in a chat
  When a python code block is posted in the chat
  Then the code block stays a plain code block
```

## Feature: Interacting with a rendered diagram  *(group 02)*
```gherkin
Scenario: The diagram opens in a zoom viewer and can be zoomed and closed   # BEH-3
  Given I am in a chat with a rendered diagram
  When I open the diagram in the zoom viewer
  Then the zoom viewer shows the diagram at full zoom level
  When I zoom in
  Then the zoom level increases
  When I reset the zoom
  Then the zoom level is back to full
  When I close the zoom viewer
  Then the zoom viewer is gone

Scenario: The diagram source can be shown and hidden   # BEH-4
  Given I am in a chat with a rendered diagram
  When I toggle the diagram source
  Then the original diagram source is revealed
  When I toggle the diagram source
  Then the diagram source is hidden again

Scenario: The diagram source can be copied   # BEH-5
  Given I am in a chat with a rendered diagram
  When I copy the diagram source
  Then the diagram source is on the clipboard and the copy action confirms
```

## Pytest-tier behaviours (no UI surface — covered out-of-band, not webm scenarios)
```gherkin
@pytest-tier  BEH-8  bundled mermaid skill discoverable  -> file/front-matter contract, tests/test_skill_contract.py
@pytest-tier  BEH-9  system-prompt + prompt-fragment nudge  -> prompt seams, tests/test_mermaid_nudge.py + tests/test_publish_nudge.py
```

## Tracked skips
(none — all UI behaviours have scenarios)
