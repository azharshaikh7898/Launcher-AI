# LaunchBoard

AI-assisted project management for small dev teams: workspaces, projects, a Kanban task board, and (soon) a project copilot.

**Status: Milestone 1, backend foundation.** The Next.js frontend, seed data, and AI copilot are the next milestones.

## What's in this milestone
- Express + TypeScript API (`apps/api`) with Zod validation and central error handling
- PostgreSQL schema via Prisma: User, Workspace, WorkspaceMember, Project, Task, Comment, ActivityLog
- Cookie-based auth (bcrypt + JWT in an HTTP-only cookie, nothing in localStorage)
- Workspace isolation: membership is checked server-side on every request, and projects/tasks are always queried through the workspace
- Roles: Owner / Admin / Member (only Admin+ can delete projects)
- Dashboard endpoint computed from real rows, activity logging, rate-limited auth routes
- Vitest + Supertest tests, GitHub Actions CI

## Run locally
```bash
docker compose up -d                      # Postgres
cp apps/api/.env.example apps/api/.env    # then set JWT_SECRET (32+ chars)
npm install
cd apps/api && npx prisma migrate dev --name init && cd ../..
npm run dev:api                           # http://localhost:4000/health
npm test
```

## API (all under /api)
| Method | Path | Notes |
|---|---|---|
| POST | /auth/register, /auth/login, /auth/logout | sets/clears session cookie |
| GET | /auth/me | current user + workspaces |
| GET/POST | /workspaces/:wid/projects | `q` search, `status` filter, `page` |
| GET/PATCH/DELETE | /workspaces/:wid/projects/:id | delete needs Admin+ |
| GET/POST | /workspaces/:wid/tasks | filter by `projectId`, `status`, `assigneeId` |
| PATCH/DELETE | /workspaces/:wid/tasks/:id | PATCH `{status, position}` is the Kanban move |
| GET | /workspaces/:wid/dashboard | metrics, chart data, deadlines, activity |

## Deploy API on Render
Build: `npm install && npm run build:api`
Start: `npm run db:deploy -w apps/api && npm run start -w apps/api`
Env: `DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN` (frontend URL), `NODE_ENV=production`. Free Postgres: Neon or Render.
