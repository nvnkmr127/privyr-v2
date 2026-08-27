import { describe, it, expect } from "vitest";
import { chooseSend } from "./service";

describe("chooseSend (24h window rule)", () => {
  it("requires a template for a fresh lead (window closed, body only)", () => {
    expect(chooseSend(false, { body: "hi {{first_name}}" })).toEqual({
      error: "Outside 24h window: an approved templateName is required to message this lead",
    });
  });

  it("uses the template when window is closed", () => {
    expect(chooseSend(false, { templateName: "welcome" })).toEqual({ mode: "template" });
  });

  it("sends free text when window is open and body given", () => {
    expect(chooseSend(true, { body: "hey" })).toEqual({ mode: "text" });
  });

  it("prefers template over body when window is open but only template usable", () => {
    // window open, but caller passed a template and no body -> template
    expect(chooseSend(true, { templateName: "welcome" })).toEqual({ mode: "template" });
  });

  it("errors when nothing to send", () => {
    expect(chooseSend(true, {})).toEqual({ error: "Nothing to send: provide body or templateName" });
  });
});
