Feature: Interacting with a rendered diagram
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
