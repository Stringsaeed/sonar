import { expect, test } from "@playwright/test";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@sonar/game";

const freshRoomCode = () =>
  Array.from(
    { length: ROOM_CODE_LENGTH },
    () => ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)],
  ).join("");

for (const variant of ["A", "B", "C"]) {
  test(`landing variant ${variant} greets the player by callsign`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/?variant=${variant}`);
    const callsign = await page
      .waitForFunction(() => localStorage.getItem("sonar.callsign"))
      .then((handle) => handle.jsonValue());
    await expect(page.getByText(callsign!, { exact: false }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("two players share a private room", async ({ browser }) => {
  const code = freshRoomCode();
  const host = await browser.newPage();
  const guest = await browser.newPage();

  await host.goto(`/r/${code}`);
  await expect(host.getByTestId("room-status")).toHaveText("Connected · 1/2 players");

  await guest.goto(`/r/${code}`);
  await expect(guest.getByTestId("room-status")).toHaveText("Connected · 2/2 players");
});
