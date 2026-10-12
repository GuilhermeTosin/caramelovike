const INTERNAL_SEARCH_PATHS = new Set(["/buscar"]);
const PRIVATE_PATHS = new Set([
  "/cadastro",
  "/entrar",
  "/redefinir-senha",
  "/perfil",
  "/negocio/wizard",
  "/marketplace/novo",
]);

export function isInternalSearchPath(pathname: string): boolean {
  return INTERNAL_SEARCH_PATHS.has(pathname);
}

export function getInternalSearchCanonicalPath(pathname: string): string {
  return pathname;
}

export function getInternalSearchRobots(pathname: string): string | null {
  return isInternalSearchPath(pathname) ? "noindex,follow,max-image-preview:large" : null;
}

export function getRouteRobots(pathname: string, search = ""): string {
  if (pathname === "/index2") return "noindex,follow";
  if (
    PRIVATE_PATHS.has(pathname)
    || pathname.startsWith("/marketplace/editar/")
    || pathname.startsWith("/preview/negocio/")
  ) {
    return "noindex,nofollow,noarchive";
  }
  if (pathname === "/marketplace" && search) return "noindex,follow";
  return getInternalSearchRobots(pathname) || "index,follow,max-image-preview:large";
}
