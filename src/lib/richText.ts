const ALLOWED_TAGS = ["b", "strong", "i", "em", "u", "br", "p", "ul", "ol", "li"] as const;

function normalizeHtml(value: string): string {
  return String(value || "")
    .replace(/<\s*div\b[^>]*>/gi, "<p>")
    .replace(/<\s*\/\s*div\s*>/gi, "</p>")
    .replace(/<\s*span\b[^>]*>/gi, "")
    .replace(/<\s*\/\s*span\s*>/gi, "")
    .replace(/&nbsp;/gi, " ");
}

export function sanitizeRichTextHtml(value: string): string {
  let html = normalizeHtml(value);

  html = html.replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  html = html.replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, "");
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  html = html.replace(/<\s*\/?\s*([a-z0-9-]+)([^>]*)>/gi, (match, tagName: string) => {
    const tag = String(tagName || "").toLowerCase();
    if (!ALLOWED_TAGS.includes(tag as (typeof ALLOWED_TAGS)[number])) return "";
    if (match.startsWith("</")) {
      return `</${tag}>`;
    }
    return tag === "br" ? "<br>" : `<${tag}>`;
  });

  return html.trim();
}

export function stripRichTextHtml(value: string): string {
  const sanitized = sanitizeRichTextHtml(value);
  if (!sanitized) return "";

  return sanitized
    .replace(/<\s*br\s*\/?\s*>/gi, " ")
    .replace(/<\/(?:p|ul|ol|li)>/gi, " ")
    .replace(/<(?:p|ul|ol|li)>/gi, " ")
    .replace(/<\/?(?:b|strong|i|em|u)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function richTextHasContent(value: string): boolean {
  return stripRichTextHtml(value).length > 0;
}

export function getRichTextBlockClassName() {
  return [
    "[&_p]:mb-3",
    "[&_p:last-child]:mb-0",
    "[&_ul]:my-3",
    "[&_ol]:my-3",
    "[&_ul]:list-disc",
    "[&_ol]:list-decimal",
    "[&_ul,&_ol]:pl-5",
    "[&_li]:mb-1",
  ].join(" ");
}

