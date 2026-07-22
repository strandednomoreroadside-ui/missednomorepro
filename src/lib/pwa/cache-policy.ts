/** Only immutable framework assets and explicit public PWA assets are cached. */
export function shouldCachePwaPath(pathname: string): boolean {
  return pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/app-icon.svg" ||
    pathname === "/offline";
}
