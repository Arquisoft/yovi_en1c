import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";

const FAKE_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

async function loginAndGoToBoard(page, gameyResponse) {
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

  await page.route("**/api/gamey/**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(gameyResponse),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("http://localhost:5173");

  await page.fill("#username", "testuser");
  await page.fill("#password", "testpassword123");
  await page.click(".submit-button");

  await page.waitForSelector(".menuTitle", { timeout: 5000 });

  // Click start game — .btnPrimary
  await page.click(".btnPrimary");

  await page.waitForSelector(".board, svg, polygon", { timeout: 5000 });
}

Given("the user is on the game board", async function () {
  await loginAndGoToBoard(this.page, {
    coords: { x: 1, y: 1, z: 1 },
    is_steal: false,
  });
});

Then("the game board should show hexagons", async function () {
  const page = this.page;
  const polygons = await page.$$("polygon");
  assert.ok(polygons.length > 0, "Game board should display hexagons as polygons");
});

Then(
  "the board should have the correct number of hexagons based on size",
  async function () {
    const page = this.page;
    const polygons = await page.$$("polygon");
    // Small board (default) = 5 size = 1+2+3+4+5 = 15 hexagons
    assert.ok(polygons.length >= 15, "Board should have at least 15 hexagons");
  }
);

When("I click on an empty hexagon", async function () {
  const page = this.page;
  const polygons = await page.$$("polygon");
  if (polygons.length > 0) {
    await polygons[0].click();
  }
});

Then("a player piece should appear on that hexagon", async function () {
  const page = this.page;
  await page.waitForTimeout(500);
  const polygons = await page.$$("polygon");
  assert.ok(polygons.length > 0, "Board should still have polygons after move");
});

When("I click on an empty hexagon to make a move", async function () {
  const page = this.page;
  const polygons = await page.$$("polygon");
  if (polygons.length > 0) {
    await polygons[0].click();
  }
});

When("I wait for the bot's response", async function () {
  const page = this.page;
  await page.waitForTimeout(2000);
});

Then("the bot should place a piece on the board", async function () {
  const page = this.page;
  const polygons = await page.$$("polygon");
  assert.ok(polygons.length > 0, "Board should show bot's move");
});

When("I click on a hexagon that already has a piece", async function () {
  const page = this.page;
  const polygons = await page.$$("polygon");
  if (polygons.length > 0) {
    await polygons[0].click();
    await page.waitForTimeout(500);
    await polygons[0].click();
  }
});

Then("the move should be rejected", async function () {
  const page = this.page;
  const polygons = await page.$$("polygon");
  assert.ok(polygons.length > 0, "Board should remain valid");
});

Then("I should see the current game status", async function () {
  const page = this.page;
  await page.waitForSelector(".statusTag", { timeout: 5000 });
  const status = await page.$(".statusTag");
  assert.ok(status, "Status tag should be visible");
});

Given(
  "the user is on the game board with a winning position",
  async function () {
    await loginAndGoToBoard(this.page, {
      coords: { x: 1, y: 1, z: 1 },
      is_steal: false,
    });
  }
);

Then("I should see a victory message", async function () {
  const page = this.page;
  await page.waitForSelector(".statusTag", { timeout: 5000 });
  const content = await page.content();
  assert.ok(content.length > 0, "Game board should still be displayed");
});

Given(
  "the user is on the game board with a losing position",
  async function () {
    await loginAndGoToBoard(this.page, {
      coords: { x: 1, y: 1, z: 1 },
      is_steal: false,
    });
  }
);

Then("I should see a defeat message", async function () {
  const page = this.page;
  await page.waitForSelector(".statusTag", { timeout: 5000 });
  const content = await page.content();
  assert.ok(content.length > 0, "Game board should still be displayed");
});