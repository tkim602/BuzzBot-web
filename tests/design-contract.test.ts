import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve("src/app/globals.css"), "utf8");
const componentCss = readFileSync(
  resolve("src/components/buzzbot/buzzbot.module.css"),
  "utf8",
);

describe("BuzzBot design contract", () => {
  it("freezes the approved shell dimensions", () => {
    expect(css).toContain("--sidebar-expanded: 260px");
    expect(css).toContain("--sidebar-collapsed: 56px");
    expect(css).toContain("--workspace-width: 768px");
    expect(css).toContain("--composer-height: 50px");
  });

  it("protects phrase boundaries in titles and body copy", () => {
    expect(css).toMatch(/body,[\s\S]*h1,[\s\S]*h2,[\s\S]*h3[\s\S]*word-break:\s*keep-all/);
    expect(css).toMatch(/overflow-wrap:\s*normal/);
  });

  it("keeps the app fixed to the viewport and scrolls only the messages", () => {
    expect(componentCss).toMatch(/\.appShell\s*{[\s\S]*?height:\s*100dvh/);
    expect(componentCss).toMatch(/\.workspaceSlot\s*{[\s\S]*?min-height:\s*0/);
    expect(componentCss).toMatch(/\.messages\s*{[\s\S]*?overflow-y:\s*auto/);
    expect(componentCss).toMatch(/\.messageTurn\s*{[\s\S]*?content-visibility:\s*auto/);
  });
});
