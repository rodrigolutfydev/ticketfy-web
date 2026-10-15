import { describe, expect, it } from "vitest";
import { PRIVACY_CONTACT_EMAIL, privacyContactHref } from "./contact";

describe("privacy contact", () => {
  it("is a real email address, not a placeholder", () => {
    expect(PRIVACY_CONTACT_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i);
    expect(PRIVACY_CONTACT_EMAIL).not.toMatch(/SEU-EMAIL-AQUI|YOUR-EMAIL-HERE/);
    expect(privacyContactHref).toBe(`mailto:${PRIVACY_CONTACT_EMAIL}`);
  });
});
