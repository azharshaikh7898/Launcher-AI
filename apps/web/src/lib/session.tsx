"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "./api";

export type Workspace = { id: string; name: string; role: "OWNER" | "ADMIN" | "MEMBER" };
type User = { id: string; name: string; email: string };
type Session = { user: User; workspace: Workspace; logout: () => Promise<void>; refresh: () => Promise<void> };

const Ctx = createContext<Session | null>(null);

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession must be used inside SessionProvider");
  return s;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<{ user: User; workspaces: Workspace[] } | null>(null);

  // Also called after profile/workspace edits so the sidebar and header update at once.
  const refresh = useCallback(async () => {
    try {
      setData(await api<{ user: User; workspaces: Workspace[] }>("/auth/me"));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.replace("/login");
    }
  }, [router]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!data || !data.workspaces[0]) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading your workspace…</div>;
  }

  const logout = async () => {
    await api("/auth/logout", { method: "POST" });
    router.replace("/login");
  };
  return <Ctx.Provider value={{ user: data.user, workspace: data.workspaces[0], logout, refresh }}>{children}</Ctx.Provider>;
}
