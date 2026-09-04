const INTERNAL_SEARCH_PATH = "/buscar";

export function isInternalSearchPath(pathname: string): boolean {
  return pathname === INTERNAL_SEARCH_PATH;
}

export function getInternalSearchCanonicalPath(pathname: string): string {
  return isInternalSearchPath(pathname) ? INTERNAL_SEARCH_PATH : pathname;
}

export function getInternalSearchRobots(pathname: string): string | null {
  return isInternalSearchPath(pathname) ? "noindex,follow,max-image-preview:large" : null;
}
