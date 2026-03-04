Feature: Register
  Validate the register form

  Scenario: Successful registration
    Given the register page is open
    When I enter "Alice" as the username and submit
    Then I should see a welcome message containing "Hello Alice"

Scenario: Show the error when the server gives error
  Given the register page is open
  And the API returns a 400 error
  When I enter "bad_user" as the username and submit
  Then I should see an error message containing "Server error"

Scenario: Show network error
  Given the register page is open
  And the network call fails
  When I enter "any_user" as the username and submit
  Then I should see an error message containing "Network error"