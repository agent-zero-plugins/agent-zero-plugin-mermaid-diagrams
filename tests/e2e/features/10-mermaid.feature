Feature: Rendering mermaid diagrams
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
