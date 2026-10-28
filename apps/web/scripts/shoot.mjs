// PROTOTYPE — throwaway helper for reviewing UI variants.
// Usage: node scripts/shoot.mjs <path> <out.png> [desktop|phone] [clickSelector]
import { chromium, devices } from "@playwright/test";

const [path = "/", out = "/tmp/shot.png", device = "desktop", click] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:5199";

const browser = await chromium.launch();
const context = await browser.newContext(
  device === "phone" ? devices["iPhone 14"] : { viewport: { width: 1440, height: 900 } },
);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
await page.goto(base + path, { waitUntil: "networkidle" });
if (click) {
  await page.locator(click).first().click();
  await page.waitForTimeout(400);
}
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`saved ${out}`);
if (errors.length) console.log(`page errors:\n${errors.join("\n")}`);
