import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve("src/app/globals.css"), "utf8");

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
});
