const INTERNAL_SEARCH_PATHS = new Set(["/buscar", "/en/search"]);

export function isInternalSearchPath(pathname: string): boolean {
  return INTERNAL_SEARCH_PATHS.has(pathname);
}

export function getInternalSearchCanonicalPath(pathname: string): string {
  return pathname;
}

export function getInternalSearchRobots(pathname: string): string | null {
  return isInternalSearchPath(pathname) ? "noindex,follow,max-image-preview:large" : null;
}
