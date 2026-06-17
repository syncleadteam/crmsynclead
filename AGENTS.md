<!-- BEGIN:nextjs-agent-rules -->
# AI-Native CRM - Codex Instructions

## Product Source of Truth

Before implementing any feature, Codex must read and follow the product documentation in:

- `docs/prd/`
- `docs/architecture/`
- `docs/product/`

The PRDs are the source of truth for product behavior, user flows, CRM entities, permissions, integrations, automation boundaries, and implementation priorities.

If product documentation conflicts with existing code, stop and explain the conflict before changing behavior.

## Project Goal

Build an AI-native CRM platform where:

- The CRM provides the management and operational interface.
- Supabase/PostgreSQL is the source of truth for operational data.
- N8N owns business automation logic.
- Codex acts as the technical co-pilot for development, testing, refactoring, diagnostics, and deployment preparation.
- Monitoring and logs feed continuous product improvement.

## Technology Stack

Use the following stack unless a PRD explicitly changes it:

- Next.js
- TypeScript
- TailwindCSS
- shadcn/ui
- Radix UI
- lucide-react
- React Query
- React Hook Form
- Zod
- Supabase
- PostgreSQL
- N8N
- Playwright

## Architecture Rules

- Supabase is the source of truth.
- Never duplicate existing tables without inspecting the schema first.
- Every schema modification must be implemented as a migration.
- Use generated Supabase types from `src/types/supabase.ts`.
- Business workflow logic belongs in N8N.
- The CRM must not duplicate N8N automation logic.
- The CRM may trigger, display, inspect, or configure workflows only where the PRDs specify it.
- Do not hardcode production credentials.
- Do not commit secrets, `.env` files, API keys, database passwords, service role keys, or MCP tokens.

## UI and UX Rules

The CRM is an operational SaaS interface, not a marketing site.

Use:

- Dense but readable dashboards
- Tables with filters and sorting
- Sidebars
- Tabs
- Drawers
- Dialogs
- Forms
- Status badges
- Activity timelines
- Search and command-style actions
- Clear empty, loading, error, and success states

Avoid:

- Landing-page-style hero sections
- Decorative oversized cards
- Excessive gradients
- One-note color palettes
- UI text explaining obvious features
- Layouts that look like marketing pages instead of CRM tools

Prefer shadcn/ui and Radix-based components. Use lucide-react icons for actions.

## Development Workflow

Before implementing a task:

1. Read the relevant PRD files.
2. Inspect the current code.
3. Inspect Supabase schema when the task touches data.
4. Identify whether the behavior belongs in the CRM, Supabase, or N8N.
5. Make the smallest coherent implementation that satisfies the PRD.

Before finishing a task, run:

npm run lint
npm run type-check
npm run test
npm run build
If a command does not exist yet, add the missing script or explain clearly why it cannot be run.
Testing Rules
Use tests according to risk:
Unit tests for utilities, validation, and business rules.
Component tests for complex UI behavior when available.
Playwright tests for user flows, forms, dashboards, authentication, and regressions.
Build verification before deploy.
For UI work, use Playwright screenshots when possible to validate that the interface renders correctly.
Supabase Rules
Before creating or changing database objects:
Inspect the current schema.
Check whether a table, enum, function, policy, or relationship already exists.
Propose the schema change.
Implement it through a migration.
Regenerate TypeScript types.
Use:
supabase migration new <migration_name>
supabase db push
supabase gen types typescript --project-id <project_ref> > src/types/supabase.ts
Do not run destructive production database commands without explicit approval.
N8N Rules
N8N is responsible for automation workflows.
Codex may:
Read workflow definitions
Suggest workflow changes
Create workflow documentation
Integrate CRM screens with workflow status
Trigger N8N workflows when specified by PRD
Codex must not:
Replace N8N workflows with frontend logic
Delete workflows without approval
Store N8N API keys in source code
Hardcode workflow IDs unless documented and configurable
Git Rules
Use small, meaningful commits.
Prefer branches for feature work:
git checkout -b codex/<short-feature-name>
Before committing:
git status
git diff
npm run lint
npm run type-check
npm run build
Commit messages should be clear and conventional enough to understand later.
Codex Permissions
Codex may:
Create features
Refactor code
Create components
Run builds
Run tests
Create Supabase migrations
Generate Supabase types
Analyze logs
Prepare pull requests
Prepare deploys
Codex must not:
Delete databases
Destroy infrastructure
Remove backups
Rotate or expose secrets without approval
Execute destructive production commands without explicit approval
Commit generated files that contain secrets or machine-local credentials
Documentation Rules
When implementing meaningful behavior, update documentation when useful:
PRD implementation notes
README setup instructions
Environment variable examples
Architecture notes
Known limitations
Keep documentation practical and close to the code.
Current Priority
Use the PRDs in docs/prd/ to derive the implementation roadmap.
If no PRD exists yet, ask for the PRD or create only foundational project setup, never invent core CRM behavior without product documentation.
<!-- END:nextjs-agent-rules -->
