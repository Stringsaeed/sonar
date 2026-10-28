import { type Browser, expect, type Page, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./viewport.ts";

const enemyCell = (page: Page, label: string) =>
  page.getByRole("button", { name: new RegExp(`^${label}, `) });

// The longest callsign the generator can make, so the header is at its widest.
const pilot = async (browser: Browser) => {
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem("sonar.callsign", "Silent Barnacle"));
  return page;
};

test("two players deploy, trade fire, and a forfeit ends in a rematch", async ({ browser }) => {
  const host = await pilot(browser);
  const guest = await pilot(browser);

  await host.goto("/");
  await host.getByRole("button", { name: "Create room" }).click();
  await expect(host).toHaveURL(/\/r\/[2-9A-Z]{6}$/);
  await guest.goto(host.url());

  for (const page of [host, guest]) {
    await expect(page.getByRole("button", { name: "Random", exact: true })).toBeVisible();
  }
  await expectNoSidewaysScroll(host, guest);
  for (const page of [host, guest]) {
    await page.getByRole("button", { name: "Random", exact: true }).click();
    await page.getByRole("button", { name: "Ready for battle" }).click();
  }

  // Exactly one player gets the first shot; wait until their board is armed.
  const armed = (page: Page) =>
    enemyCell(page, "A1")
      .and(page.locator(':not([aria-disabled="true"])'))
      .waitFor()
      .then(() => page);
  const shooter = await Promise.race([armed(host), armed(guest)]);
  const defender = shooter === host ? guest : host;
  await expectNoSidewaysScroll(host, guest);

  await enemyCell(shooter, "A1").click();
  await expect(enemyCell(shooter, "A1")).toHaveAttribute("aria-label", /^A1, (hit|miss)/);
  // The turn passes: the defender is armed now.
  await expect(enemyCell(defender, "J10")).not.toHaveAttribute("aria-disabled", "true");

  await defender.getByRole("button", { name: "Forfeit match" }).click();
  await defender.getByRole("button", { name: "Confirm forfeit" }).click();
  await expect(shooter.getByText("Victory", { exact: false }).first()).toBeVisible();
  await expect(defender.getByText("Defeat", { exact: false }).first()).toBeVisible();
  await expectNoSidewaysScroll(host, guest);

  await shooter.getByRole("button", { name: "Rematch" }).click();
  await defender.getByRole("button", { name: "Accept rematch" }).click();
  for (const page of [host, guest]) {
    await expect(page.getByRole("button", { name: "Random", exact: true })).toBeVisible();
  }
});

test("Quick Match pairs two strangers into the same room", async ({ browser }, testInfo) => {
  // One shared queue: parallel runs in other projects would cross-pair.
  test.skip(testInfo.project.name !== "desktop", "the queue is global");
  const a = await browser.newPage();
  const b = await browser.newPage();
  for (const page of [a, b]) {
    await page.goto("/");
    await page.getByRole("button", { name: /Quick match/ }).click();
  }
  for (const page of [a, b]) {
    await expect(page).toHaveURL(/\/q\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("button", { name: "Random", exact: true })).toBeVisible();
  }
  expect(a.url()).toBe(b.url());
});
