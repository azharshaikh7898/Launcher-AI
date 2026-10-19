export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 4v16M12 4v10M19 4v6" />
        </svg>
      </div>
      <span className={`text-[15px] font-semibold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>LaunchBoard</span>
    </div>
  );
}
