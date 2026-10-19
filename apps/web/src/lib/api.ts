export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, string[]>) {
    super(message);
  }
}

type Options = Omit<RequestInit, "body"> & { json?: unknown };

/** Thin fetch wrapper: same-origin /api, cookies included, unwraps { data } and throws ApiError. */
export async function api<T>(path: string, { json, headers, ...init }: Options = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: { message?: string; details?: Record<string, string[]> } }
    | null;
  if (!res.ok) throw new ApiError(res.status, body?.error?.message ?? "Request failed", body?.error?.details);
  return body?.data as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const first = err.details && Object.entries(err.details)[0];
    return first ? `${first[0]}: ${first[1][0]}` : err.message;
  }
  return "Something went wrong. Please try again.";
}
