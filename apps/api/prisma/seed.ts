import { PrismaClient, type TaskStatus, type Priority, type ProjectStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DAY = 864e5;
const DONE_DAYS = [0, 0, 1, 3, 3, 3, 5]; // days ago each done task was completed
const at = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY);

type Seed = [title: string, status: TaskStatus, priority: Priority, labels: string[], due: number | null, who: "demo" | "priya" | "sam" | null];
const projects: { name: string; description: string; status: ProjectStatus; deadline: number; tasks: Seed[] }[] = [
  {
    name: "Website Redesign", status: "ACTIVE", deadline: 21,
    description: "Refresh the marketing site: new landing page, pricing, and a faster build.",
    tasks: [
      ["Design new hero section", "DONE", "HIGH", ["design"], -4, "priya"],
      ["Set up Next.js project", "DONE", "MEDIUM", ["setup"], -6, "demo"],
      ["Build pricing page", "IN_REVIEW", "HIGH", ["frontend"], 2, "demo"],
      ["Optimise images and fonts", "IN_PROGRESS", "MEDIUM", ["performance"], 5, "sam"],
      ["Write launch announcement", "TODO", "LOW", ["content"], 10, null],
      ["Fix mobile nav overflow", "TODO", "CRITICAL", ["bug", "frontend"], -2, "demo"],
    ],
  },
  {
    name: "Mobile App MVP", status: "ACTIVE", deadline: 45,
    description: "First release of the iOS and Android companion app.",
    tasks: [
      ["Define MVP scope", "DONE", "HIGH", ["planning"], -10, "priya"],
      ["Auth screens", "DONE", "HIGH", ["frontend"], -5, "sam"],
      ["Push notification service", "IN_PROGRESS", "HIGH", ["backend"], 6, "sam"],
      ["Offline task sync", "TODO", "MEDIUM", ["backend"], 18, "demo"],
      ["App store assets", "TODO", "LOW", ["design"], 30, null],
    ],
  },
  {
    name: "Payments API", status: "ON_HOLD", deadline: 60,
    description: "Stripe integration for subscriptions and invoices. Waiting on compliance review.",
    tasks: [
      ["Stripe webhook handler", "IN_REVIEW", "CRITICAL", ["backend", "security"], 1, "demo"],
      ["Invoice PDF generation", "TODO", "MEDIUM", ["backend"], 25, "priya"],
      ["Refund flow", "TODO", "HIGH", ["backend"], 40, null],
    ],
  },
  {
    name: "Analytics Dashboard", status: "COMPLETED", deadline: -8,
    description: "Internal usage dashboard for the product team. Shipped.",
    tasks: [
      ["Event tracking schema", "DONE", "HIGH", ["data"], -20, "sam"],
      ["Weekly active users chart", "DONE", "MEDIUM", ["frontend"], -14, "priya"],
      ["Export to CSV", "DONE", "LOW", ["feature"], -9, "demo"],
    ],
  },
];

async function main() {
  const emails = ["demo@launchboard.dev", "priya@launchboard.dev", "sam@launchboard.dev"];
  await db.workspace.deleteMany({ where: { name: "Northwind Dev Team" } });
  await db.user.deleteMany({ where: { email: { in: emails } } });

  const passwordHash = await bcrypt.hash("password123", 10);
  const demo = await db.user.create({ data: { name: "Alex Morgan", email: emails[0]!, passwordHash } });
  const priya = await db.user.create({ data: { name: "Priya Nair", email: emails[1]!, passwordHash } });
  const sam = await db.user.create({ data: { name: "Sam Carter", email: emails[2]!, passwordHash } });
  const people = { demo, priya, sam };

  const workspace = await db.workspace.create({
    data: {
      name: "Northwind Dev Team",
      members: { create: [{ userId: demo.id, role: "OWNER" }, { userId: priya.id, role: "ADMIN" }, { userId: sam.id, role: "MEMBER" }] },
    },
  });

  let doneIndex = 0;
  const firstTasks: string[] = [];
  for (const p of projects) {
    const project = await db.project.create({
      data: { workspaceId: workspace.id, name: p.name, description: p.description, status: p.status, deadline: at(p.deadline) },
    });
    for (const [i, [title, status, priority, labels, due, who]] of p.tasks.entries()) {
      const task = await db.task.create({
        data: {
          projectId: project.id, title, status, priority, labels, position: i,
          dueDate: due === null ? null : at(due),
          assigneeId: who ? people[who].id : null,
          // spread completions over the last week so the weekly chart has a shape
          completedAt: status === "DONE" ? at(-DONE_DAYS[doneIndex++ % DONE_DAYS.length]!) : null,
          description: `Details for “${title}”.`,
        },
      });
      if (i === 0) firstTasks.push(task.id);
    }
  }

  const comments = [
    [priya.id, "Looks good to me, shipping the final assets today."],
    [sam.id, "I'll pair on this tomorrow if anyone is blocked."],
    [demo.id, "Pushed a fix, please re-test on a small screen."],
  ] as const;
  for (const [i, [authorId, body]] of comments.entries()) {
    await db.comment.create({ data: { taskId: firstTasks[i % firstTasks.length]!, authorId, body, createdAt: at(-i) } });
  }

  const log = [
    [priya.id, "completed", "Design new hero section", 0.1],
    [demo.id, "moved", "Build pricing page to In Review", 0.3],
    [sam.id, "commented on", "Push notification service", 1],
    [demo.id, "created", "Fix mobile nav overflow", 1.5],
    [priya.id, "created project", "Payments API", 3],
  ] as const;
  for (const [actorId, action, name, ago] of log) {
    await db.activityLog.create({
      data: { workspaceId: workspace.id, actorId, action, entityType: "task", entityId: "seed", meta: { name }, createdAt: at(-ago) },
    });
  }
  console.log("Seeded. Login: demo@launchboard.dev / password123");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
