# AI-Native CRM Implementation Notes

## Current Scope

Implemented locally through migrations and Next.js Route Handlers:

- RBAC users, teams and team members.
- Companies, contacts, leads, pipelines and pipeline stages.
- Deals, activities, lead conversion and pipeline movement.
- Products, deal products, proposals and audit logs.
- Tasks, agenda, overdue read model and task completion timeline events.
- Dashboard/report endpoints.
- N8N callback endpoints and integration state.

## Automation Boundary

The CRM does not send WhatsApp, email or calendar events directly. N8N owns channel orchestration and calls CRM callback endpoints with `N8N_CALLBACK_TOKEN`.

Callbacks implemented:

- `POST /api/v1/tasks/{id}/calendar-sync`
- `POST /api/v1/leads/{id}/score`
- `POST /api/v1/activities`

## Supabase Application

The local repository contains migrations, but they have not been pushed to Supabase yet. Final deployment requires:

```bash
npx supabase login
supabase db push
supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" > src/types/supabase.ts
```

## Known Limitations

- Tests are currently contract checks. API integration tests should be added after Supabase local or remote test credentials are configured.
- The Kanban uses a responsive move selector instead of drag-and-drop. This keeps the workflow operable on mobile and desktop; drag-and-drop can be layered on later.
- Auth admin user creation is not automated. `/api/v1/users` creates CRM profiles for existing Supabase Auth users.
