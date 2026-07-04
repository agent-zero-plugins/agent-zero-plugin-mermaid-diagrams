Feature: Rendering mermaid diagrams
  Scenario: A mermaid diagram in the chat is rendered   # BEH-1
    Given I am in a chat
    When a mermaid diagram is posted in the chat
    Then it is rendered as a diagram

  Scenario: An invalid diagram shows an error, not a crash   # BEH-2
    Given I am in a chat
    When an invalid mermaid diagram is posted in the chat
    Then an error is shown for it and the chat keeps working
