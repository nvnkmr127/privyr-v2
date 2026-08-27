import { describe, it, expect } from "vitest";
import { parseWebhook } from "./parse";

describe("parseWebhook", () => {
  it("extracts inbound text messages and statuses from the Meta envelope", () => {
    const body = {
      entry: [{
        changes: [{
          value: {
            messages: [{ from: "919876543210", id: "wamid.A", type: "text", text: { body: "hi" } }],
            statuses: [{ id: "wamid.OUT", status: "read", recipient_id: "919876543210" }],
          },
        }],
      }],
    };
    expect(parseWebhook(body)).toEqual({
      messages: [{ from: "919876543210", id: "wamid.A", body: "hi" }],
      statuses: [{ id: "wamid.OUT", status: "read" }],
    });
  });

  it("skips non-text messages and tolerates empty/garbage payloads", () => {
    const body = {
      entry: [{ changes: [{ value: { messages: [{ from: "1", id: "x", type: "image", image: {} }] } }] }],
    };
    expect(parseWebhook(body)).toEqual({ messages: [], statuses: [] });
    expect(parseWebhook({})).toEqual({ messages: [], statuses: [] });
    expect(parseWebhook(null)).toEqual({ messages: [], statuses: [] });
  });
});
