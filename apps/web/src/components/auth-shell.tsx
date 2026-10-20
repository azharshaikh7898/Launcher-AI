import type { InputHTMLAttributes, ReactNode } from "react";
import { Logo } from "./logo";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-navy-900 p-12 text-white lg:flex">
        <Logo dark />
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Ship projects without the chaos.</h2>
          <p className="mt-4 text-slate-400">Plan sprints, move work across the board and see what is at risk, all in one calm workspace for your dev team.</p>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            {["Kanban boards that save every move", "Workspaces with owner, admin and member roles", "Live progress from your real task data"].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />{t}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500">Built with Next.js, Express, Prisma and PostgreSQL · Made by <a href="https://github.com/azharshaikh7898" target="_blank" rel="noopener noreferrer" className="underline decoration-slate-600 underline-offset-2 hover:text-slate-300">Azhar</a></p>
      </aside>
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mb-8 mt-1.5 text-sm text-slate-500">{subtitle}</p>
          {children}
          <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>
        </div>
      </main>
    </div>
  );
}

export function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
    </label>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
