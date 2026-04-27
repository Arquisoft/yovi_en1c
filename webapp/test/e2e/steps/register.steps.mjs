import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";

Given("the register page is open", async function () {
  await this.page.goto("http://localhost:5173");
});

When("the API returns a successful registration", async function () {
  await this.page.route("**/api/users/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Login successful",
        token: "fake-token-for-testing",
        user: { id: "123", username: "Alice" },
      }),
    });
  });
});
/*
When("I enter {string} as the username and submit", async function (username) {
  const page = this.page;
  await page.fill("#username", username);
  await page.fill("#password", "testpassword123");
  await page.click(".submit-button");
});

Then(
  "I should see a welcome message containing {string}",
  async function (expectedName) {
    const page = this.page;
    await page.waitForSelector(".menuSubtitle", { timeout: 5000 });
    const text = await page.textContent(".menuSubtitle");
    assert.ok(
      text.includes(expectedName),
      `Expected name "${expectedName}" not found in: "${text}"`,
    );
  },
);
*/
When("the API returns a 400 error", async function () {
  await this.page.route("**/api/users/login", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Server error" }),
    });
  });
});

When("the network call fails", async function () {
  await this.page.route("**/api/users/login", async (route) =>
    route.abort("failed"),
  );
});

Then(
  "I should see an error message containing {string}",
  async function (expected) {
    const page = this.page;
    await page.waitForSelector(".error-message", { timeout: 5000 });
    const text = await page.textContent(".error-message");

    const actualExpected =
      expected === "Network error" ? "Failed to fetch" : expected;

    assert.ok(
      text.includes(actualExpected),
      `Error expected: "${actualExpected}", obtained: "${text}"`,
    );
  },
);
