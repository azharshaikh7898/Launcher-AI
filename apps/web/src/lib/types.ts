export type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";

export type Member = { id: string; name: string; email: string; role: "OWNER" | "ADMIN" | "MEMBER" };
export type Task = {
  id: string; title: string; description: string; status: Status; priority: Priority;
  labels: string[]; dueDate: string | null; position: number; projectId: string;
  assigneeId: string | null; assignee: { id: string; name: string } | null; _count: { comments: number };
};
export type Project = {
  id: string; name: string; description: string; status: ProjectStatus; deadline: string | null;
  progress?: number; _count?: { tasks: number };
};
export type Comment = { id: string; body: string; createdAt: string; author: { id: string; name: string } };

export const COLUMNS: { key: Status; label: string; dot: string }[] = [
  { key: "TODO", label: "To Do", dot: "bg-slate-400" },
  { key: "IN_PROGRESS", label: "In Progress", dot: "bg-indigo-500" },
  { key: "IN_REVIEW", label: "In Review", dot: "bg-violet-400" },
  { key: "DONE", label: "Done", dot: "bg-emerald-500" },
];
export const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const PRIORITY_STYLE: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-600", MEDIUM: "bg-sky-50 text-sky-700",
  HIGH: "bg-amber-50 text-amber-700", CRITICAL: "bg-red-50 text-red-700",
};
export const PROJECT_STATUSES: { key: ProjectStatus; label: string; style: string }[] = [
  { key: "PLANNING", label: "Planning", style: "bg-slate-100 text-slate-600" },
  { key: "ACTIVE", label: "Active", style: "bg-indigo-50 text-indigo-700" },
  { key: "ON_HOLD", label: "On hold", style: "bg-amber-50 text-amber-700" },
  { key: "COMPLETED", label: "Completed", style: "bg-emerald-50 text-emerald-700" },
];
export const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
