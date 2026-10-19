"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { UserMinus } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";
import { initials, type Member } from "@/lib/types";
import { Shell } from "@/components/shell";
import { Card } from "@/components/card";
import { btnDanger, btnPrimary, btnSecondary, inputCls, Modal } from "@/components/modal";

type Row = Member & { joinedAt: string };
const ROLE_STYLE: Record<Member["role"], string> = {
  OWNER: "bg-violet-50 text-violet-700", ADMIN: "bg-indigo-50 text-indigo-700", MEMBER: "bg-slate-100 text-slate-600",
};

export default function TeamPage() {
  return <Shell title="Team"><TeamContent /></Shell>;
}

function TeamContent() {
  const { workspace, user } = useSession();
  const canManage = workspace.role !== "MEMBER";
  const base = `/workspaces/${workspace.id}/members`;
  const [members, setMembers] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Row | null>(null);

  const load = useCallback(() => {
    api<Row[]>(base).then(setMembers).catch((e) => setError(errorMessage(e)));
  }, [base]);
  useEffect(load, [load]);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    setInviteError(null);
    try {
      await api(base, { method: "POST", json: { email, role } });
      setEmail("");
      load();
    } catch (err) {
      setInviteError(errorMessage(err));
    }
    setAdding(false);
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      await api(`${base}/${removing.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
    setRemoving(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Team</h2>
        <p className="text-sm text-slate-500">People who can see and work on {workspace.name}.</p>
      </div>

      {canManage && (
        <Card title="Add a teammate" description="They need a LaunchBoard account first. Enter the email they registered with.">
          <form onSubmit={invite} className="flex flex-wrap gap-3">
            <input type="email" required aria-label="Teammate email" placeholder="name@company.com" className={`${inputCls} min-w-0 flex-1`} value={email} onChange={(e) => setEmail(e.target.value)} />
            <select aria-label="Role" className={`${inputCls.replace("w-full", "")} w-auto`} value={role} onChange={(e) => setRole(e.target.value as "MEMBER" | "ADMIN")}>
              <option value="MEMBER">Member</option><option value="ADMIN">Admin</option>
            </select>
            <button type="submit" disabled={adding} className={btnPrimary}>{adding ? "Adding…" : "Add"}</button>
          </form>
          {inviteError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{inviteError}</p>}
        </Card>
      )}

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Card title={`Members${members ? ` (${members.length})` : ""}`}>
        {!members ? (
          <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : (
          <ul className="-my-2 divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{initials(m.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}{m.id === user.id && <span className="ml-2 text-xs font-normal text-slate-400">you</span>}</p>
                  <p className="truncate text-xs text-slate-500">{m.email} · joined {new Date(m.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_STYLE[m.role]}`}>{m.role.toLowerCase()}</span>
                {canManage && m.role !== "OWNER" && m.id !== user.id && (
                  <button onClick={() => setRemoving(m)} aria-label={`Remove ${m.name}`} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><UserMinus className="h-4 w-4" /></button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {removing && (
        <Modal title="Remove teammate?" onClose={() => setRemoving(null)}>
          <p className="text-sm text-slate-600"><span className="font-medium text-slate-900">{removing.name}</span> will lose access to this workspace. Tasks assigned to them become unassigned.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setRemoving(null)} className={btnSecondary}>Cancel</button>
            <button onClick={confirmRemove} className={btnDanger}>Remove</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
