import { describe, it, expect } from "vitest";
import { ContentSharingService } from "./contentSharingService";

describe("ContentSharingService.normalizeUrl", () => {
  it("accepts http and https links unchanged", () => {
    expect(ContentSharingService.normalizeUrl("https://example.com/a.pdf")).toBe("https://example.com/a.pdf");
    expect(ContentSharingService.normalizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("adds https:// when no scheme is given", () => {
    expect(ContentSharingService.normalizeUrl("example.com/brochure")).toBe("https://example.com/brochure");
  });

  it("rejects non-web schemes (open-redirect / XSS guard)", () => {
    expect(ContentSharingService.normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(ContentSharingService.normalizeUrl("data:text/html,<script>")).toBeNull();
    expect(ContentSharingService.normalizeUrl("not a url")).toBeNull();
  });
});
