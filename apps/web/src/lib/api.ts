export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, string[]>) {
    super(message);
  }
}

type Options = Omit<RequestInit, "body"> & { json?: unknown };
type Meta = { page: number; pageSize: number; total: number };

/** Same-origin /api, cookies included. Returns the unwrapped { data, meta } or throws ApiError. */
export async function apiPaged<T>(path: string, { json, headers, ...init }: Options = {}): Promise<{ data: T; meta?: Meta }> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  if (res.status === 204) return { data: undefined as T };
  const body = (await res.json().catch(() => null)) as
    | { data?: T; meta?: Meta; error?: { message?: string; details?: Record<string, string[]> } }
    | null;
  if (!res.ok) throw new ApiError(res.status, body?.error?.message ?? "Request failed", body?.error?.details);
  return { data: body?.data as T, meta: body?.meta };
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  return (await apiPaged<T>(path, options)).data;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const first = err.details && Object.entries(err.details)[0];
    return first ? `${first[0]}: ${first[1][0]}` : err.message;
  }
  return "Something went wrong. Please try again.";
}
