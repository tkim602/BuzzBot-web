import { expect, test } from "@playwright/test";

test("chat calls the API and resumes from local history after reload", async ({
  page,
}) => {
  const requests: Array<{ query: string; thread_id: string; history: unknown[] }> = [];
  await page.route("http://localhost:8000/chat", async (route) => {
    const request = route.request().postDataJSON();
    requests.push(request);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        thread_id: request.thread_id,
        answer: requests.length === 1 ? "Fall classes begin August 17." : "It is a Monday.",
        citations: [],
        confidence: 0.91,
        freshness: { strategy: "langgraph_controlled", as_of: "2026-08-25T00:00:00Z" },
        notes: [],
      }),
    });
  });
  await page.goto("/");

  const composer = page.getByRole("textbox", { name: "Message BuzzBot" });
  await composer.fill("When do Fall classes begin?");
  await composer.press("Enter");
  await expect(page.getByText("Fall classes begin August 17.")).toBeVisible();
  await composer.fill("What day is that?");
  await composer.press("Enter");
  await expect(page.getByText("It is a Monday.")).toBeVisible();

  expect(requests[1]).toMatchObject({
    thread_id: requests[0].thread_id,
    history: [
      { role: "user", content: "When do Fall classes begin?" },
      { role: "assistant", content: "Fall classes begin August 17." },
    ],
  });

  await page.reload();
  await expect(page.getByText("It is a Monday.")).toBeVisible();
  await page.getByRole("button", { name: "New chat" }).click();
  await expect(page.getByRole("heading", { name: "What can I help you with at Tech?" })).toBeVisible();
  await page
    .getByRole("button", { name: "When do Fall classes begin?", exact: true })
    .click();
  await expect(page.getByText("It is a Monday.")).toBeVisible();
});

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
  if (!process.env.CI) {
    await expect(page).toHaveScreenshot("buzzbot-desktop.png", {
      fullPage: true,
    });
  }
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
  if (!process.env.CI) {
    await expect(page).toHaveScreenshot("buzzbot-mobile.png", { fullPage: true });
  }
});
