"use client";

import { useCallback, useEffect, useState } from "react";
import { apiPaged, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Shell } from "@/components/shell";
import { btnSecondary } from "@/components/modal";

type Entry = { id: string; action: string; entityType: string; meta: { name?: string } | null; createdAt: string; actor: { name: string } | null };
const PAGE_SIZE = 20;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export default function ActivityPage() {
  return <Shell title="Activity"><ActivityContent /></Shell>;
}

function ActivityContent() {
  const { workspace } = useSession();
  const [items, setItems] = useState<Entry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (p: number) => {
    try {
      const { data, meta } = await apiPaged<Entry[]>(`/workspaces/${workspace.id}/activity?page=${p}&pageSize=${PAGE_SIZE}`);
      setItems((prev) => (p === 1 ? data : [...(prev ?? []), ...data]));
      setTotal(meta?.total ?? data.length);
      setPage(p);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [workspace.id]);

  useEffect(() => { void load(1); }, [load]);

  const groups = (items ?? []).reduce<{ label: string; entries: Entry[] }[]>((acc, e) => {
    const label = dayLabel(e.createdAt);
    const last = acc[acc.length - 1];
    if (last && last.label === label) last.entries.push(e);
    else acc.push({ label, entries: [e] });
    return acc;
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Activity</h2>
        <p className="text-sm text-slate-500">A running log of what changed in {workspace.name}.</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!items ? (
        !error && <div className="h-64 animate-pulse rounded-xl bg-slate-200/70" aria-busy="true" />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">No activity yet. Create a project or move a task and it will show up here.</div>
      ) : (
        <>
          {groups.map((g) => (
            <section key={g.label}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{g.label}</h3>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-card">
                {g.entries.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    <p className="flex-1 text-slate-600">
                      <span className="font-medium text-slate-900">{a.actor?.name ?? "Someone"}</span> {a.action}{" "}
                      {a.meta?.name ? <span className="font-medium text-slate-900">{a.meta.name}</span> : a.entityType}
                    </p>
                    <time className="shrink-0 text-xs text-slate-400" dateTime={a.createdAt}>{new Date(a.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</time>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {items.length < total && (
            <div className="text-center">
              <button disabled={loadingMore} className={btnSecondary} onClick={async () => { setLoadingMore(true); await load(page + 1); setLoadingMore(false); }}>
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
