import { When, Then } from "@cucumber/cucumber";
import assert from "assert";

When("I click the back button", async function () {
  const page = this.page;
  const buttons = await page.$$(".btn");
  for (const button of buttons) {
    const text = await button.textContent();
    if (
      text &&
      (text.includes("Back") ||
        text.includes("Volver") ||
        text.includes("Geri") ||
        text.includes("Takaisin"))
    ) {
      await button.click();
      break;
    }
  }
});

Then("I should return to the game menu", async function () {
  const page = this.page;
  await page.waitForSelector(".menuTitle", { timeout: 5000 });
});

Then("the game board should be displayed", async function () {
  const page = this.page;
  await page.waitForSelector(".board, svg polygon", { timeout: 5000 });
});

Then("the menu page should be displayed", async function () {
  const page = this.page;
  await page.waitForSelector(".menuTitle", { timeout: 5000 });
  const menuTitle = await page.textContent(".menuTitle");
  assert.ok(menuTitle, "Menu page should be displayed");
});

Then("the login page should be displayed", async function () {
  const page = this.page;
  const usernameInput = await page.$("#username");
  assert.ok(usernameInput, "Login page should have username input");
});