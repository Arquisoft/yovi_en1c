Feature: GameMenu
  Validate the game menu and game configuration

  Scenario: View game menu after login
    Given the user is logged in and on the menu
    Then I should see the game menu with configuration options
    And I should see board size, game mode, and difficulty options

  Scenario: Change board size
    Given the user is logged in and on the menu
    When I click the next button for board size
    Then the board size should change

  Scenario: Change game mode
    Given the user is logged in and on the menu
    When I click the next button for game mode
    Then the game mode should change

  Scenario: Change difficulty level
    Given the user is logged in and on the menu
    When I click the next button for difficulty
    Then the difficulty level should change

  Scenario: Navigate to previous options
    Given the user is logged in and on the menu
    When I click the next button for board size
    And I click the previous button for board size
    Then I should be back to the original board size

  Scenario: Start game with selected configuration
    Given the user is logged in and on the menu
    When I click the start game button
    Then the game board should be displayed

  Scenario: View game history
    Given the user is logged in and on the menu
    When I click the view history button
    Then the game history page should be displayed

  Scenario: Logout from menu
    Given the user is logged in and on the menu
    When I click the logout button
    Then I should be back on the login page
