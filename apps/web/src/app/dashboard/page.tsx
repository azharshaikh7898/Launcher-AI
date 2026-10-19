"use client";

import { useEffect, useState, type ComponentType } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, FolderKanban, Gauge } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Shell } from "@/components/shell";

type Dashboard = {
  activeProjects: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  statusDistribution: Record<string, number>;
  weeklyCompletion: { day: string; date: string; count: number }[];
  upcoming: { id: string; title: string; priority: string; dueDate: string; project: { name: string } }[];
  activity: { id: string; action: string; entityType: string; meta: { name?: string } | null; createdAt: string; actor: { name: string } | null }[];
};

const STATUS = [
  { key: "TODO", label: "To Do", color: "#94a3b8" },
  { key: "IN_PROGRESS", label: "In Progress", color: "#6366f1" },
  { key: "IN_REVIEW", label: "In Review", color: "#a78bfa" },
  { key: "DONE", label: "Done", color: "#10b981" },
];
const PRIORITY: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-sky-50 text-sky-700",
  HIGH: "bg-amber-50 text-amber-700",
  CRITICAL: "bg-red-50 text-red-700",
};

function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-card ${className}`}>
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: ComponentType<{ className?: string }>; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Shell title="Dashboard">
      <DashboardContent />
    </Shell>
  );
}

function DashboardContent() {
  const { workspace, user } = useSession();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Dashboard>(`/workspaces/${workspace.id}/dashboard`).then(setData).catch((e) => setError(errorMessage(e)));
  }, [workspace.id]);

  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200/70" />)}</div>
        <div className="grid gap-6 lg:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-200/70" />)}</div>
      </div>
    );
  }

  const total = Object.values(data.statusDistribution).reduce((a, b) => a + b, 0);
  if (total === 0 && data.activeProjects === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <FolderKanban className="mx-auto h-8 w-8 text-indigo-500" />
        <h2 className="mt-4 text-lg font-semibold">Your workspace is empty</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Once you add projects and tasks, progress charts and deadlines will show up here.</p>
      </div>
    );
  }

  const pie = STATUS.map((s) => ({ ...s, value: data.statusDistribution[s.key] ?? 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Good to see you, {user.name.split(" ")[0]}</h2>
        <p className="text-sm text-slate-500">Here is where {workspace.name} stands today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active projects" value={data.activeProjects} icon={FolderKanban} tone="bg-indigo-50 text-indigo-600" />
        <Stat label="Completed tasks" value={data.completedTasks} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
        <Stat label="Overdue tasks" value={data.overdueTasks} icon={AlertTriangle} tone="bg-red-50 text-red-600" />
        <Stat label="Completion" value={`${data.completionRate}%`} icon={Gauge} tone="bg-violet-50 text-violet-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Task status" className="lg:col-span-2">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="label" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
                  {pie.map((s) => <Cell key={s.key} fill={s.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {pie.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                {s.label}<span className="ml-auto font-medium text-slate-900">{s.value}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Completed this week" className="lg:col-span-3">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyCompletion} margin={{ left: -20, right: 4, top: 4 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="count" name="Tasks" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Upcoming deadlines">
          {data.upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing due soon.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.upcoming.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.project.name} · due {new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY[t.priority] ?? ""}`}>{t.priority.toLowerCase()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent activity">
          {data.activity.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.activity.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  <p className="flex-1 text-slate-600">
                    <span className="font-medium text-slate-900">{a.actor?.name ?? "Someone"}</span> {a.action} {a.meta?.name ? <span className="font-medium text-slate-900">{a.meta.name}</span> : a.entityType}
                  </p>
                  <time className="shrink-0 text-xs text-slate-400">{timeAgo(a.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
