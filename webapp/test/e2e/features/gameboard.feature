Feature: GameBoard
  Validate the game board and gameplay mechanics

  Scenario: Game board is displayed with correct size
    Given the user is on the game board
    Then the game board should show hexagons
    And the board should have the correct number of hexagons based on size

  Scenario: Player can click on a hex to place a piece
    Given the user is on the game board
    When I click on an empty hexagon
    Then a player piece should appear on that hexagon

  Scenario: Bot makes a move after player
    Given the user is on the game board
    When I click on an empty hexagon to make a move
    And I wait for the bot's response
    Then the bot should place a piece on the board

  Scenario: Invalid moves are prevented
    Given the user is on the game board
    When I click on a hexagon that already has a piece
    Then the move should be rejected

  Scenario: Game status is displayed
    Given the user is on the game board
    Then I should see the current game status

  Scenario: Back button returns to menu
    Given the user is on the game board
    When I click the back button
    Then I should return to the game menu

  Scenario: Player wins the game
    Given the user is on the game board with a winning position
    Then I should see a victory message

  Scenario: Bot wins the game
    Given the user is on the game board with a losing position
    Then I should see a defeat message
