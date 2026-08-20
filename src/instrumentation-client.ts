// Client tracing is deliberately disabled. Server, API, edge, and webhook
// failures remain covered without adding the monitoring SDK to every page.
export function onRouterTransitionStart(
  _href: string,
  _navigationType: "push" | "replace" | "traverse",
) {}
