Feature: Register
  Validate the register form

  Scenario: Successful registration
    Given the register page is open
    And the API returns a successful registration


Scenario: Show the error when the server gives error
  Given the register page is open
  And the API returns a 400 error


Scenario: Show network error
  Given the register page is open
  And the network call fails
