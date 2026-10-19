"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { MessageSquare, Plus, Search } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";
import { COLUMNS, PRIORITY_STYLE, PROJECT_STATUSES, initials, type Member, type Project, type Status, type Task } from "@/lib/types";
import { Shell } from "@/components/shell";
import { TaskDialog } from "@/components/task-dialog";
import { inputCls } from "@/components/modal";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { workspace } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dialog, setDialog] = useState<{ task: Task | null; status: Status } | null>(null);
  const [dragging, setDragging] = useState<Task | null>(null);
  const base = `/workspaces/${workspace.id}`;

  const loadTasks = useCallback(
    () => api<Task[]>(`${base}/tasks?projectId=${id}`).then(setTasks).catch((e) => setError(errorMessage(e))),
    [base, id],
  );

  useEffect(() => {
    Promise.all([api<Project>(`${base}/projects/${id}`), api<Member[]>(`${base}/members`)])
      .then(([p, m]) => { setProject(p); setMembers(m); })
      .catch((e) => setError(errorMessage(e)));
    loadTasks();
  }, [base, id, loadTasks]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Distance constraint lets a plain click open the task while a real drag starts the move.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (tasks ?? []).filter(
      (t) => (!assignee || (assignee === "none" ? !t.assigneeId : t.assigneeId === assignee))
        && (!term || t.title.toLowerCase().includes(term) || t.labels.some((l) => l.toLowerCase().includes(term))),
    );
  }, [tasks, search, assignee]);

  async function move(task: Task, to: Status) {
    const previous = tasks ?? [];
    // Optimistic update: the card jumps immediately, then we confirm with the server.
    setTasks(previous.map((t) => (t.id === task.id ? { ...t, status: to } : t)));
    try {
      await api(`${base}/tasks/${task.id}`, { method: "PATCH", json: { status: to } });
    } catch (e) {
      setTasks(previous); // rollback
      setToast(`Could not move "${task.title}": ${errorMessage(e)}`);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const task = tasks?.find((t) => t.id === e.active.id);
    const to = e.over && COLUMNS.find((c) => c.key === String(e.over!.id))?.key;
    if (task && to && task.status !== to) void move(task, to);
  }

  const done = (tasks ?? []).filter((t) => t.status === "DONE").length;
  const progress = tasks && tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const st = project && PROJECT_STATUSES.find((s) => s.key === project.status);

  return (
    <Shell title={<span className="flex items-center gap-2 text-slate-500"><Link href="/projects" className="hover:text-slate-900">Projects</Link><span>/</span><span className="truncate text-slate-900">{project?.name ?? "…"}</span></span>}>
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}. <Link href="/projects" className="font-medium underline">Back to projects</Link></p>
      ) : !project || !tasks ? (
        <div className="h-96 animate-pulse rounded-xl bg-slate-200/70" aria-busy="true" />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight">{project.name}</h2>
                {st && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.style}`}>{st.label}</span>}
              </div>
              <p className="mt-1 text-sm text-slate-500">{project.description || "No description yet."}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${progress}%` }} /></div>
                <span>{progress}% done · {done} of {tasks.length} tasks{project.deadline ? ` · due ${new Date(project.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}</span>
              </div>
            </div>
            <button onClick={() => setDialog({ task: null, status: "TODO" })} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"><Plus className="h-4 w-4" />New task</button>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input aria-label="Search tasks" placeholder="Search tasks or labels" className={`${inputCls} pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select aria-label="Filter by assignee" className={`${inputCls} w-auto`} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Everyone</option><option value="none">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setDragging(tasks.find((t) => t.id === e.active.id) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {COLUMNS.map((col) => (
                <Column key={col.key} col={col} tasks={visible.filter((t) => t.status === col.key)} onAdd={() => setDialog({ task: null, status: col.key })} onOpen={(t) => setDialog({ task: t, status: t.status })} />
              ))}
            </div>
            <DragOverlay>{dragging ? <CardBody task={dragging} lifted /> : null}</DragOverlay>
          </DndContext>
        </div>
      )}

      {toast && <div role="alert" className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toast}</div>}
      {dialog && <TaskDialog workspaceId={workspace.id} projectId={id} task={dialog.task} defaultStatus={dialog.status} members={members} onClose={() => setDialog(null)} onChanged={loadTasks} />}
    </Shell>
  );
}

function Column({ col, tasks, onAdd, onOpen }: { col: (typeof COLUMNS)[number]; tasks: Task[]; onAdd: () => void; onOpen: (t: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <section ref={setNodeRef} aria-label={col.label} className={`flex min-h-[220px] flex-col rounded-xl p-3 transition ${isOver ? "bg-indigo-50 ring-2 ring-indigo-300" : "bg-slate-100/70"}`}>
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${col.dot}`} />
        <h3 className="text-sm font-semibold">{col.label}</h3>
        <span className="rounded-full bg-white px-2 text-xs font-medium text-slate-500">{tasks.length}</span>
        <button onClick={onAdd} aria-label={`Add task to ${col.label}`} className="ml-auto rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"><Plus className="h-4 w-4" /></button>
      </div>
      <div className="flex flex-1 flex-col gap-2.5">
        {tasks.map((t) => <DraggableCard key={t.id} task={t} onOpen={onOpen} />)}
        {tasks.length === 0 && <p className="px-1 pt-2 text-xs text-slate-400">Drop a task here</p>}
      </div>
    </section>
  );
}

function DraggableCard({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} onClick={() => onOpen(task)} className={isDragging ? "opacity-40" : ""}>
      <CardBody task={task} />
    </div>
  );
}

function CardBody({ task, lifted = false }: { task: Task; lifted?: boolean }) {
  const overdue = task.status !== "DONE" && task.dueDate !== null && new Date(task.dueDate) < new Date();
  return (
    <div className={`cursor-grab rounded-lg border border-slate-200 bg-white p-3 text-left shadow-card transition hover:border-indigo-200 ${lifted ? "rotate-1 shadow-lg" : ""}`}>
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      {task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">{task.labels.map((l) => <span key={l} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{l}</span>)}</div>
      )}
      <div className="mt-3 flex items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_STYLE[task.priority]}`}>{task.priority.toLowerCase()}</span>
        {task.dueDate && <span className={overdue ? "font-medium text-red-600" : "text-slate-500"}>{new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
        <span className="ml-auto flex items-center gap-2">
          {task._count.comments > 0 && <span className="flex items-center gap-1 text-slate-400"><MessageSquare className="h-3.5 w-3.5" />{task._count.comments}</span>}
          {task.assignee && <span title={task.assignee.name} className="grid h-6 w-6 place-items-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">{initials(task.assignee.name)}</span>}
        </span>
      </div>
    </div>
  );
}
