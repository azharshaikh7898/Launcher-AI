"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { COLUMNS, PRIORITIES, initials, type Comment, type Member, type Priority, type Status, type Task } from "@/lib/types";
import { btnDanger, btnPrimary, btnSecondary, inputCls, Label, Modal } from "./modal";

type Props = {
  workspaceId: string; projectId: string; task: Task | null; defaultStatus: Status;
  members: Member[]; onClose: () => void; onChanged: () => void;
};

export function TaskDialog({ workspaceId, projectId, task, defaultStatus, members, onClose, onChanged }: Props) {
  const base = `/workspaces/${workspaceId}/tasks`;
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<Status>(task?.status ?? defaultStatus);
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "MEDIUM");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const [labels, setLabels] = useState(task?.labels.join(", ") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (task) api<Comment[]>(`${base}/${task.id}/comments`).then(setComments).catch(() => undefined);
  }, [base, task]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const json = {
      title, description, status, priority,
      assigneeId: assigneeId || null, dueDate: dueDate || null,
      labels: labels.split(",").map((l) => l.trim()).filter(Boolean),
    };
    try {
      if (task) await api(`${base}/${task.id}`, { method: "PATCH", json });
      else await api(base, { method: "POST", json: { ...json, projectId } });
      onChanged();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  async function remove() {
    if (!task) return;
    try {
      await api(`${base}/${task.id}`, { method: "DELETE" });
      onChanged();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function addComment(e: FormEvent) {
    e.preventDefault();
    if (!task || !draft.trim()) return;
    try {
      const c = await api<Comment>(`${base}/${task.id}/comments`, { method: "POST", json: { body: draft } });
      setComments((prev) => [...prev, c]);
      setDraft("");
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal title={task ? "Edit task" : "New task"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <Label text="Title"><input autoFocus required minLength={2} maxLength={120} className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Label>
        <Label text="Description"><textarea rows={3} maxLength={4000} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} /></Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as Status)}>{COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
          </Label>
          <Label text="Priority">
            <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{PRIORITIES.map((p) => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}</select>
          </Label>
          <Label text="Assignee">
            <select className={inputCls} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Label>
          <Label text="Due date"><input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Label>
        </div>
        <Label text="Labels (comma separated)"><input placeholder="bug, frontend" className={inputCls} value={labels} onChange={(e) => setLabels(e.target.value)} /></Label>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          <div>
            {task && (confirmDelete
              ? <button type="button" onClick={remove} className={btnDanger}>Click again to delete</button>
              : <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-medium text-red-600 hover:underline">Delete task</button>)}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : task ? "Save changes" : "Create task"}</button>
          </div>
        </div>
      </form>

      {task && (
        <section className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="mb-3 text-sm font-semibold">Comments</h3>
          <ul className="space-y-3">
            {comments.length === 0 && <li className="text-sm text-slate-500">No comments yet.</li>}
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">{initials(c.author.name)}</span>
                <div className="text-sm">
                  <p><span className="font-medium">{c.author.name}</span> <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></p>
                  <p className="text-slate-600">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <form onSubmit={addComment} className="mt-4 flex gap-2">
            <input aria-label="Add a comment" placeholder="Write a comment" maxLength={2000} className={inputCls} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button type="submit" disabled={!draft.trim()} className={btnPrimary}>Post</button>
          </form>
        </section>
      )}
    </Modal>
  );
}
