"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";
import { PROJECT_STATUSES, type Project } from "@/lib/types";
import { Shell } from "@/components/shell";
import { ProjectDialog } from "@/components/project-dialog";
import { btnDanger, btnPrimary, btnSecondary, inputCls, Modal } from "@/components/modal";

export default function ProjectsPage() {
  return <Shell title="Projects"><ProjectsContent /></Shell>;
}

function ProjectsContent() {
  const { workspace } = useSession();
  const canDelete = workspace.role !== "MEMBER";
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ pageSize: "50" });
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    api<Project[]>(`/workspaces/${workspace.id}/projects?${params}`)
      .then((d) => { setProjects(d); setError(null); })
      .catch((e) => setError(errorMessage(e)));
  }, [workspace.id, q, status]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce typing in the search box
    return () => clearTimeout(t);
  }, [load]);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api(`/workspaces/${workspace.id}/projects/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      load();
    } catch (e) {
      setError(errorMessage(e));
      setDeleting(null);
    }
  }

  const filtering = q.trim() !== "" || status !== "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Projects</h2>
          <p className="text-sm text-slate-500">Everything your team is building in {workspace.name}.</p>
        </div>
        <button onClick={() => setEditing("new")} className={`${btnPrimary} inline-flex items-center gap-2`}><Plus className="h-4 w-4" />New project</button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input aria-label="Search projects" placeholder="Search projects" className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Filter by status" className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!projects ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-xl bg-slate-200/70" />)}</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <FolderKanban className="mx-auto h-8 w-8 text-indigo-500" />
          <h3 className="mt-4 font-semibold">{filtering ? "No projects match your filters" : "No projects yet"}</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{filtering ? "Try a different search or clear the status filter." : "Create your first project to start planning tasks on a board."}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const st = PROJECT_STATUSES.find((s) => s.key === p.status)!;
            return (
              <article key={p.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-indigo-200">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/projects/${p.id}`} className="font-semibold leading-snug hover:text-indigo-700">{p.name}</Link>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${st.style}`}>{st.label}</span>
                </div>
                <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">{p.description || "No description yet."}</p>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                    <span>{p._count?.tasks ?? 0} tasks</span><span className="font-medium text-slate-700">{p.progress ?? 0}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${p.progress ?? 0}%` }} /></div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>{p.deadline ? `Due ${new Date(p.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : "No deadline"}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`} className="rounded-md p-1.5 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                    {canDelete && <button onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`} className="rounded-md p-1.5 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && <ProjectDialog workspaceId={workspace.id} project={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={load} />}
      {deleting && (
        <Modal title="Delete project?" onClose={() => setDeleting(null)}>
          <p className="text-sm text-slate-600"><span className="font-medium text-slate-900">{deleting.name}</span> and all of its tasks and comments will be permanently deleted. This cannot be undone.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setDeleting(null)} className={btnSecondary}>Cancel</button>
            <button onClick={confirmDelete} className={btnDanger}>Delete project</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
