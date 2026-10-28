import { expect, type Page } from "@playwright/test";

// Anything wider than the screen lets phones pan sideways or zoom out, which puts sticky
// controls out of reach. The page clips sideways overflow, so measure the app root (which
// doesn't) rather than the document.
export const expectNoSidewaysScroll = async (...pages: Page[]) => {
  for (const page of pages) {
    await expect
      .poll(() =>
        page.evaluate(() => {
          const root = document.getElementById("root")!;
          return root.scrollWidth - root.clientWidth;
        }),
      )
      .toBe(0);
  }
};
