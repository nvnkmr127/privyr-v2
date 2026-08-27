import { describe, it, expect } from "vitest";
import { renderTemplate, buildDeepLink } from "./deeplink";

const lead = { name: "Jane Doe", phone: "+1 (415) 555-0100", email: "jane@acme.com", company: "Acme" };

describe("renderTemplate", () => {
  it("fills known tokens and blanks unknown ones", () => {
    expect(renderTemplate("Hi {{first_name}} from {{company}}! {{missing}}", lead)).toBe(
      "Hi Jane from Acme! "
    );
  });
});

describe("buildDeepLink", () => {
  it("whatsapp strips non-digits from phone", () => {
    expect(buildDeepLink("whatsapp", lead, "hey")).toBe("https://wa.me/14155550100?text=hey");
  });
  it("email uses mailto with subject+body", () => {
    expect(buildDeepLink("email", lead, "hi", "Hello")).toBe(
      "mailto:jane@acme.com?subject=Hello&body=hi"
    );
  });
  it("returns null when the required field is missing", () => {
    expect(buildDeepLink("whatsapp", { name: "No Phone" }, "hey")).toBeNull();
    expect(buildDeepLink("email", { name: "No Email" }, "hey")).toBeNull();
  });
});
