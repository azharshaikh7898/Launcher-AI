"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSession } from "@/lib/session";
import { initials } from "@/lib/types";
import { Logo } from "./logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
];

export function Shell({ title, children }: { title: ReactNode; children: ReactNode }) {
  const { user, workspace, logout } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-900 text-slate-300">
      <div className={`flex h-16 items-center ${collapsed ? "justify-center" : "px-5"}`}><Logo dark /></div>
      <div className={`mx-3 mb-4 rounded-lg bg-navy-800 px-3 py-2.5 ${collapsed ? "hidden" : ""}`}>
        <p className="text-[11px] uppercase tracking-wider text-slate-500">Workspace</p>
        <p className="truncate text-sm font-medium text-white">{workspace.name}</p>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-indigo-500/15 text-white" : "hover:bg-navy-800 hover:text-white"} ${collapsed ? "justify-center" : ""}`}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-indigo-400" : ""}`} />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/5 p-3">
        <button onClick={logout} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-navy-800 hover:text-white ${collapsed ? "justify-center" : ""}`}>
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && "Log out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 lg:block ${collapsed ? "w-[72px]" : "w-64"}`}>{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-64">{sidebar}</aside>
        </div>
      )}
      <div className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-[72px]" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
          <button className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <button className="hidden rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:block" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <div className="min-w-0 text-[15px] font-semibold">{title}</div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs capitalize text-slate-500">{workspace.role.toLowerCase()}</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{initials(user.name)}</div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
