const API_BASE_URL = "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  // DELETE responses can be empty, and failed requests may not contain JSON.
  const data: { message?: string } | null =
    response.status === 204
      ? null
      : await response.json().catch((cause: unknown) => {
          init.signal?.throwIfAborted();
          if (response.ok) throw cause;
          return null;
        });

  if (
    response.status === 401 &&
    (!path.startsWith("/auth/") || path === "/auth/socket-ticket") &&
    typeof window !== "undefined"
  ) {
    const returnTo = window.location.pathname + window.location.search;
    window.location.replace(`/signin?next=${encodeURIComponent(returnTo)}`);
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  return data as T;
}
