import { describe, expect, it } from "vitest";
import { sanitizeRichTextHtml } from "@/lib/richText";

describe("sanitizeRichTextHtml", () => {
  it("preserves line breaks in plain-text descriptions", () => {
    expect(sanitizeRichTextHtml("First line\nSecond line\n\nThird line")).toBe(
      "First line<br>Second line<br><br>Third line"
    );
  });

  it("keeps lists and converts breaks within formatted blocks", () => {
    const description = "<p>First line\nSecond line</p>\n<ul><li>One</li><li>Two</li></ul>";

    expect(sanitizeRichTextHtml(description)).toBe(
      "<p>First line<br>Second line</p><ul><li>One</li><li>Two</li></ul>"
    );
  });
});
