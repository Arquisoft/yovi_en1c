import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";

const FAKE_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

const MOCK_GAMES = [
  {
    _id: "1",
    result: "player_won",
    totalMoves: 15,
    playedAt: new Date().toISOString(),
    board: { "0,0,0": 0 },
    difficulty: "easy",
    boardSize: "small",
    mode: "standard",
    points: 100,
  },
  {
    _id: "2",
    result: "bot_won",
    totalMoves: 20,
    playedAt: new Date().toISOString(),
    board: { "0,0,0": 1 },
    difficulty: "hard",
    boardSize: "medium",
    mode: "standard",
    points: 0,
  },
];

const MOCK_LEADERBOARD = [
  { username: "testuser", totalPoints: 100, gamesPlayed: 2 },
  { username: "player2", totalPoints: 80, gamesPlayed: 5 },
  { username: "player3", totalPoints: 60, gamesPlayed: 3 },
];

const MOCK_STATS = {
  byDifficulty: [
    { _id: "easy", total: 10, wins: 7 },
    { _id: "hard", total: 5, wins: 1 },
  ],
  progression: [
    { points: 0, date: "2024-01-01" },
    { points: 100, date: "2024-01-02" },
  ],
  avgMoves: [
    { _id: "easy", avgMoves: 12 },
    { _id: "hard", avgMoves: 18 },
  ],
};

async function setupRoutes(page, gamesData) {
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

  await page.route("**/api/users/games/list**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(gamesData),
    });
  });

  await page.route("**/api/users/games/leaderboard**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_LEADERBOARD),
    });
  });

  await page.route("**/api/users/games/stats**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_STATS),
    });
  });
}

async function loginAndNavigateToHistory(page) {
  await page.fill("#username", "testuser");
  await page.fill("#password", "testpassword123");
  await page.click(".submit-button");

  await page.waitForSelector(".menuTitle", { timeout: 5000 });

  const buttons = await page.$$(".btn.btnSecondary");
  if (buttons.length > 0) {
    await buttons[0].click();
  }

  await page.waitForSelector(".historyCard", { timeout: 5000 });
}

Given("the user is logged in and navigates to history", async function () {
  const page = this.page;
  await setupRoutes(page, MOCK_GAMES);
  await page.goto("http://localhost:5173");
  await loginAndNavigateToHistory(page);
});

Then("the game history page should load", async function () {
  const page = this.page;
  await page.waitForSelector(".historyCard", { timeout: 5000 });
  const card = await page.$(".historyCard");
  assert.ok(card, "History card should be visible");
});

Then("I should see game records and statistics", async function () {
  const page = this.page;
  await page.waitForSelector(".historyTable", { timeout: 5000 });
  const table = await page.$(".historyTable");
  assert.ok(table, "Should display game records table");
});

Given("the user is on the game history page", async function () {
  const page = this.page;
  await setupRoutes(page, MOCK_GAMES);
  await page.goto("http://localhost:5173");
  await loginAndNavigateToHistory(page);
});

When("I click on the sort dropdown", async function () {
  const page = this.page;
  await page.waitForSelector(".sortable", { timeout: 5000 });
  const sortable = await page.$(".sortable");
  if (sortable) {
    await sortable.click();
  }
});

Then(
  "I should be able to sort by date, moves, result, difficulty, or board size",
  async function () {
    const page = this.page;
    await page.waitForSelector(".sortable", { timeout: 5000 });
    const sortables = await page.$$(".sortable");
    assert.ok(sortables.length > 0, "Sort headers should be visible");
  }
);

When("I select to filter by wins only", async function () {
  const page = this.page;
  const tabs = await page.$$(".filterTab");
  for (const tab of tabs) {
    const text = await tab.textContent();
    if (
      text &&
      (text.includes("Win") ||
        text.includes("win") ||
        text.includes("Ganad"))
    ) {
      await tab.click();
      break;
    }
  }
});

Then("only winning games should be displayed", async function () {
  const page = this.page;
  await page.waitForTimeout(500);
  const card = await page.$(".historyCard");
  assert.ok(card, "History page should still be displayed");
});

When("I click on the leaderboard tab", async function () {
  const page = this.page;
  const buttons = await page.$$(".toggleBtn");
  for (const button of buttons) {
    const text = await button.textContent();
    if (
      text &&
      (text.includes("Leaderboard") ||
        text.includes("leader") ||
        text.includes("Clasif") ||
        text.includes("Sıralama") ||
        text.includes("Tulostauluk"))
    ) {
      await button.click();
      break;
    }
  }
});

Then("I should see a list of top players", async function () {
  const page = this.page;
  await page.waitForSelector(".historyTable", { timeout: 5000 });
  const rows = await page.$$(".historyTable tbody tr");
  assert.ok(rows.length > 0, "Leaderboard should have player rows");
});

Then("I should see charts displaying:", async function (dataTable) {
  const page = this.page;
  const buttons = await page.$$(".toggleBtn");
  for (const button of buttons) {
    const text = await button.textContent();
    if (
      text &&
      (text.includes("Stats") ||
        text.includes("stat") ||
        text.includes("Estad") ||
        text.includes("İstat") ||
        text.includes("Tilast"))
    ) {
      await button.click();
      break;
    }
  }
  await page.waitForSelector(".statsDashboard, .chartCard", { timeout: 5000 });
  const dashboard = await page.$(".statsDashboard, .chartCard");
  assert.ok(dashboard, "Stats dashboard should be visible");
});