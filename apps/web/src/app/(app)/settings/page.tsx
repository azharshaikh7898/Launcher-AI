"use client";

import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Shell } from "@/components/shell";
import { Card } from "@/components/card";
import { btnPrimary, inputCls, Label } from "@/components/modal";

type Msg = { ok: boolean; text: string } | null;

function Notice({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <p role={msg.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>;
}

export default function SettingsPage() {
  return <Shell title="Settings"><SettingsContent /></Shell>;
}

function SettingsContent() {
  const { user, workspace, refresh } = useSession();
  const canRename = workspace.role !== "MEMBER";

  const [name, setName] = useState(user.name);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);
  const [wsName, setWsName] = useState(workspace.name);
  const [wsMsg, setWsMsg] = useState<Msg>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, setMsg: (m: Msg) => void, fn: () => Promise<void>, okText: string) {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: okText });
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
    setBusy(null);
  }

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    void run("profile", setProfileMsg, async () => { await api("/account/profile", { method: "PATCH", json: { name } }); await refresh(); }, "Profile updated.");
  };
  const saveWorkspace = (e: FormEvent) => {
    e.preventDefault();
    void run("ws", setWsMsg, async () => { await api(`/workspaces/${workspace.id}`, { method: "PATCH", json: { name: wsName } }); await refresh(); }, "Workspace renamed.");
  };
  const savePassword = (e: FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) return setPwMsg({ ok: false, text: "The new passwords do not match." });
    void run("pw", setPwMsg, async () => {
      await api("/account/password", { method: "POST", json: { currentPassword: pw.current, newPassword: pw.next } });
      setPw({ current: "", next: "", confirm: "" });
    }, "Password changed.");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-slate-500">Manage your profile, workspace and password.</p>
      </div>

      <Card title="Profile">
        <form onSubmit={saveProfile} className="space-y-4">
          <Label text="Full name"><input required minLength={2} maxLength={60} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Label>
          <Label text="Email"><input disabled className={`${inputCls} bg-slate-50 text-slate-500`} value={user.email} /></Label>
          <Notice msg={profileMsg} />
          <button type="submit" disabled={busy === "profile" || name.trim() === user.name} className={btnPrimary}>{busy === "profile" ? "Saving…" : "Save profile"}</button>
        </form>
      </Card>

      <Card title="Workspace" description={canRename ? undefined : "Only owners and admins can rename the workspace."}>
        <form onSubmit={saveWorkspace} className="space-y-4">
          <Label text="Workspace name"><input required minLength={2} maxLength={60} disabled={!canRename} className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-500`} value={wsName} onChange={(e) => setWsName(e.target.value)} /></Label>
          <p className="text-xs text-slate-500">Your role: <span className="font-medium capitalize text-slate-700">{workspace.role.toLowerCase()}</span></p>
          <Notice msg={wsMsg} />
          {canRename && <button type="submit" disabled={busy === "ws" || wsName.trim() === workspace.name} className={btnPrimary}>{busy === "ws" ? "Saving…" : "Rename workspace"}</button>}
        </form>
      </Card>

      <Card title="Password">
        <form onSubmit={savePassword} className="space-y-4">
          <Label text="Current password"><input type="password" autoComplete="current-password" required className={inputCls} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Label text="New password"><input type="password" autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" className={inputCls} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Label>
            <Label text="Confirm new password"><input type="password" autoComplete="new-password" required minLength={8} className={inputCls} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Label>
          </div>
          <Notice msg={pwMsg} />
          <button type="submit" disabled={busy === "pw"} className={btnPrimary}>{busy === "pw" ? "Saving…" : "Change password"}</button>
        </form>
      </Card>
    </div>
  );
}
