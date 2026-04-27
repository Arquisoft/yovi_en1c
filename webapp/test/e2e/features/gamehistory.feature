Feature: GameHistory
  Validate the game history page and statistics

  Scenario: View game history page
    Given the user is logged in and navigates to history
    Then the game history page should load
    And I should see game records and statistics

  Scenario: Sort game history by different fields
    Given the user is on the game history page
    When I click on the sort dropdown
    Then I should be able to sort by date, moves, result, difficulty, or board size

  Scenario: View game statistics charts
    Given the user is on the game history page
    Then I should see charts displaying:
      | chart_type |
      | line chart |
      | bar chart  |

  Scenario: Filter games by status
    Given the user is on the game history page
    When I select to filter by wins only
    Then only winning games should be displayed

  Scenario: View leaderboard
    Given the user is on the game history page
    When I click on the leaderboard tab
    Then I should see a list of top players

  Scenario: Back button returns to menu
    Given the user is on the game history page
    When I click the back button
    Then I should return to the game menu
