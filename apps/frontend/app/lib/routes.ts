export function workspacePath(organizationId: string) {
  return `/workspaces/${encodeURIComponent(organizationId)}`;
}

export function boardPath(organizationId: string, boardId: string) {
  return `${workspacePath(organizationId)}/boards/${encodeURIComponent(boardId)}`;
}

export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/dashboard";
  // Only allow application destinations, never arbitrary URLs or auth loops.
  return /^\/(dashboard|invitations|workspaces)(\/|$|\?)/.test(value) &&
    !/[\\\r\n]/.test(value)
    ? value
    : "/dashboard";
}
