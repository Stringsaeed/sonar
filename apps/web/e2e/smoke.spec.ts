import { expect, test } from "@playwright/test";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@sonar/game";
import { expectNoSidewaysScroll } from "./viewport.ts";

const freshRoomCode = () =>
  Array.from(
    { length: ROOM_CODE_LENGTH },
    () => ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)],
  ).join("");

test("landing greets the pilot and shows their record and fleet activity", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");

  const callsign = await page
    .waitForFunction(() => localStorage.getItem("sonar.callsign"))
    .then((handle) => handle.jsonValue());
  await expect(page.getByRole("heading", { name: callsign! })).toBeVisible();
  await expect(page.getByText("Matches today")).toBeVisible();
  await expect(page.getByText(/No sorties yet|Recent sorties/).first()).toBeVisible();
  await expect(page.getByText("Online", { exact: false }).first()).toBeVisible();
  await expectNoSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test("creating a private room drops the host into it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create room" }).click();
  await expect(page).toHaveURL(/\/r\/[2-9A-Z]{6}$/);
  await expect(page.getByTestId("room-status")).toContainText("Send this link to a friend");
  await expectNoSidewaysScroll(page);
});

test("joining by code normalizes what the player types", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/Room code/).fill("k7qx4m");
  await page.getByRole("button", { name: "Join room" }).click();
  await expect(page).toHaveURL(/\/r\/K7QX4M$/);
});

test("a second player joining sends both straight to placement", async ({ browser }) => {
  const code = freshRoomCode();
  const host = await browser.newPage();
  const guest = await browser.newPage();

  await host.goto(`/r/${code}`);
  await expect(host.getByTestId("room-status")).toContainText("Send this link to a friend");

  await guest.goto(`/r/${code}`);
  for (const page of [host, guest]) {
    await expect(page.getByRole("button", { name: "Random", exact: true })).toBeVisible();
  }
});
