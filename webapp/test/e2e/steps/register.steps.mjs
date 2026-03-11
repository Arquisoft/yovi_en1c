import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";

Given("the register page is open", async function () {
  const page = this.page;
  if (!page) throw new Error("Page not initialized");
  await page.goto("http://localhost:5173");
});

When("I enter {string} as the username and submit", async function (username) {
  const page = this.page;
  if (!page) throw new Error("Page not initialized");
  await page.fill("#username", username);
  await page.click(".submit-button");
});

Then(
  "I should see a welcome message containing {string}",
  async function (expected) {
    const page = this.page;
    if (!page) throw new Error("Page not initialized");
    await page.waitForSelector(".success-message", { timeout: 5000 });
    const text = await page.textContent(".success-message");
    assert.ok(
      text && text.includes(expected),
      `Expected success message to include "${expected}", got: "${text}"`,
    );
  },
);

When("the API returns a 400 error", async function () {
  await this.page.route("**/users/createuser", (route) => {
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Server error" }),
    });
  });
});

When("the network call fails", async function () {
  await this.page.route("**/users/createuser", (route) =>
    route.abort("failed"),
  );
});

Then(
  "I should see a welcome message containing {string}",
  async function (expected) {
    const page = this.page;
    await page.waitForSelector(".success-message", { timeout: 5000 });
    const text = await page.textContent(".success-message");
    assert.ok(text && text.includes(expected));
  },
);

Then(
  "I should see an error message containing {string}",
  async function (expected) {
    const page = this.page;

    await page.waitForSelector(".error-message", { timeout: 5000 });
    const text = await page.textContent(".error-message");
    assert.ok(
      text && text.includes(expected),
      `Error expected: ${expected}, obtained: ${text}`,
    );
  },
);
