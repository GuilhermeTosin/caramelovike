export const EXTERNAL_LINK_TARGET = "_blank";

function buildExternalLinkRel(parts: string[]): string {
  return Array.from(new Set(parts.map((part) => part.trim()).filter(Boolean))).join(" ");
}

export function getExternalLinkRel(options?: { allowFollow?: boolean }): string {
  return buildExternalLinkRel([
    "ugc",
    options?.allowFollow ? "" : "nofollow",
    "noopener",
  ]);
}

export function getExternalLinkProps(options?: { allowFollow?: boolean }) {
  return {
    target: EXTERNAL_LINK_TARGET,
    rel: getExternalLinkRel(options),
  } as const;
}
