import { describe, expect, it } from "vitest";
import {
  firebaseConfigFromEnv,
  isPersonalizationEligible,
} from "@/components/buzzbot/auth";

describe("auth helpers", () => {
  it("allows personalization only for verified Georgia Tech email addresses", () => {
    expect(
      isPersonalizationEligible({ email: "student@GATECH.EDU", emailVerified: true }),
    ).toBe(true);
    expect(
      isPersonalizationEligible({ email: "student@gatech.edu", emailVerified: false }),
    ).toBe(false);
    expect(
      isPersonalizationEligible({ email: "student@example.com", emailVerified: true }),
    ).toBe(false);
  });

  it("disables Firebase when any public web setting is missing", () => {
    expect(firebaseConfigFromEnv({})).toBeNull();
    expect(
      firebaseConfigFromEnv({
        apiKey: "key",
        authDomain: "buzzbot.firebaseapp.com",
        projectId: "buzzbot",
        appId: "app",
      }),
    ).toEqual({
      apiKey: "key",
      authDomain: "buzzbot.firebaseapp.com",
      projectId: "buzzbot",
      appId: "app",
    });
  });
});
