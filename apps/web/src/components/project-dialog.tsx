"use client";

import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { PROJECT_STATUSES, type Project, type ProjectStatus } from "@/lib/types";
import { btnPrimary, btnSecondary, inputCls, Label, Modal } from "./modal";

export function ProjectDialog({ workspaceId, project, onClose, onSaved }: { workspaceId: string; project: Project | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "ACTIVE");
  const [deadline, setDeadline] = useState(project?.deadline?.slice(0, 10) ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const json = { name, description, status, deadline: deadline || null };
    try {
      if (project) await api(`/workspaces/${workspaceId}/projects/${project.id}`, { method: "PATCH", json });
      else await api(`/workspaces/${workspaceId}/projects`, { method: "POST", json });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={project ? "Edit project" : "New project"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Label text="Name"><input autoFocus required minLength={2} maxLength={80} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Label>
        <Label text="Description"><textarea rows={3} maxLength={1000} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} /></Label>
        <div className="grid grid-cols-2 gap-3">
          <Label text="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Label>
          <Label text="Deadline"><input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Label>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : project ? "Save changes" : "Create project"}</button>
        </div>
      </form>
    </Modal>
  );
}
