const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/i;

export function isBusinessRoutePath(pathname: string) {
  const path = pathname.split(/[?#]/u, 1)[0];
  const segments = path.split("/").filter(Boolean);

  if (segments[0] === "preview" && segments[1] === "negocio" && segments.length === 3) {
    return true;
  }

  if (segments.length === 2) {
    return COUNTRY_CODE_PATTERN.test(segments[0]);
  }

  return segments.length === 4 && COUNTRY_CODE_PATTERN.test(segments[0]);
}
