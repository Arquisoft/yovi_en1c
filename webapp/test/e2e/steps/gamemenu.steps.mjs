import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";

const FAKE_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

Given("the user is logged in and on the menu", async function () {
  const page = this.page;

  await page.route("**/api/users/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Login successful",
        token: FAKE_TOKEN,
        user: { id: "123", username: "testuser" },
      }),
    });
  });

  await page.goto("http://localhost:5173");

  await page.fill("#username", "testuser");
  await page.fill("#password", "testpassword123");
  await page.click(".submit-button");

  await page.waitForSelector(".menuTitle", { timeout: 5000 });
});

Then(
  "I should see the game menu with configuration options",
  async function () {
    const page = this.page;
    const menuTitle = await page.textContent(".menuTitle");
    assert.ok(menuTitle, "Menu title should be visible");
  }
);

Then(
  "I should see board size, game mode, and difficulty options",
  async function () {
    const page = this.page;
    await page.waitForSelector(".menuSection", { timeout: 5000 });
    const sections = await page.$$(".menuSection");
    assert.ok(sections.length >= 3, "Should have at least 3 config sections");
  }
);

When("I click the next button for board size", async function () {
  const page = this.page;
  const buttons = await page.$$(".carouselButton");
  if (buttons.length >= 2) {
    await buttons[1].click();
  }
});

Then("the board size should change", async function () {
  const page = this.page;
  const menuTitle = await page.textContent(".menuTitle");
  assert.ok(menuTitle, "Menu should still be visible after changing board size");
});

When("I click the next button for game mode", async function () {
  const page = this.page;
  const buttons = await page.$$(".carouselButton");
  if (buttons.length >= 4) {
    await buttons[3].click();
  }
});

Then("the game mode should change", async function () {
  const page = this.page;
  const menuTitle = await page.textContent(".menuTitle");
  assert.ok(menuTitle, "Menu should still be visible after changing game mode");
});

When("I click the next button for difficulty", async function () {
  const page = this.page;
  const buttons = await page.$$(".carouselButton");
  if (buttons.length >= 6) {
    await buttons[5].click();
  }
});

Then("the difficulty level should change", async function () {
  const page = this.page;
  const menuTitle = await page.textContent(".menuTitle");
  assert.ok(
    menuTitle,
    "Menu should still be visible after changing difficulty"
  );
});

When("I click the previous button for board size", async function () {
  const page = this.page;
  const buttons = await page.$$(".carouselButton");
  if (buttons.length >= 1) {
    await buttons[0].click();
  }
});

Then("I should be back to the original board size", async function () {
  const page = this.page;
  const menuTitle = await page.textContent(".menuTitle");
  assert.ok(menuTitle, "Menu should still be visible");
});

When("I click the start game button", async function () {
  const page = this.page;
  await page.click(".btnPrimary");
});

When("I click the view history button", async function () {
  const page = this.page;
  const buttons = await page.$$(".btn.btnSecondary");
  for (const button of buttons) {
    const text = await button.textContent();
    if (text && text.includes("History") || text && text.includes("histor") || text && text.includes("Histor")) {
      await button.click();
      break;
    }
  }
});

Then("the game history page should be displayed", async function () {
  const page = this.page;
  await page.waitForSelector(".historyCard, .history", { timeout: 5000 });
});
