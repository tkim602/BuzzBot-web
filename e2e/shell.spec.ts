import { expect, test } from "@playwright/test";

test("desktop sidebar collapses and the untouched composer stays compact", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const sidebar = page.getByRole("complementary", { name: "Chat sidebar" });
  await expect(sidebar).toHaveCSS("width", "260px");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(sidebar).toHaveCSS("width", "56px");
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();

  const composer = page.getByRole("form", { name: "Message BuzzBot" });
  const box = await composer.boundingBox();
  expect(box?.height).toBeLessThanOrEqual(52);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    1280,
  );
  await expect(page).toHaveScreenshot("buzzbot-desktop.png", {
    fullPage: true,
  });
});

test("mobile uses a drawer and preserves phrase-safe layout", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const sidebar = page.getByRole("complementary", { name: "Chat sidebar" });
  await expect(sidebar).toBeHidden();
  await page.getByRole("button", { name: "Open sidebar" }).click();
  await expect(sidebar).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sidebar).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    375,
  );
  await expect(page).toHaveScreenshot("buzzbot-mobile.png", { fullPage: true });
});
