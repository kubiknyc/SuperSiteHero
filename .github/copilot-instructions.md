# Copilot instructions for this repository

Purpose: quick, actionable guidance for AI coding assistants to be productive in this codebase.

1. Big-picture
   - This is an offline-first, multi-tenant construction field platform (React + TypeScript + Vite).
   - Backend: Supabase (Postgres, Auth, Storage, Realtime). Offline sync uses IndexedDB + service-worker patterns in `src/lib/offline/`.
   - Key flows: client (React) ⇄ Supabase (via `src/lib/supabase.ts`) → migrations in `/migrations`.

2. Where to look first
   - App entry: `src/main.tsx`, routing & layout: `src/App.tsx`, feature modules under `src/features/`.
   - API surface: typed services in `src/lib/api/services/*` and `src/lib/api/index.ts`.
   - DB types: `src/types/database.generated.ts` and `src/types/database-extensions.ts` (source of truth for table shapes).
   - Supabase client: `src/lib/supabase.ts` (use `supabase` for typed tables; `supabaseUntyped` for legacy/untyped tables).
   - Offline & sync: `src/lib/offline/*` (sync-manager, conflict resolver, indexeddb wrappers).

3. Important developer commands (examples from `package.json`)
   - Dev server: `npm run dev` (Vite)
   - Build: `npm run build` (production)
   - Typecheck: `npm run type-check` (tsc --noEmit)
   - Lint/format: `npm run lint` / `npm run lint:fix` / `npm run format:check`
   - Unit tests: `npm run test:unit` (Vitest)
   - E2E tests: `npm run test:e2e` (Playwright). Use `npm run playwright:install` first for browsers.
   - Seed test data: `npm run seed:test` and `npm run test:e2e:seed` (these are used in CI flows).
   - CI sanity: `npm run ci:test` runs lint + type-check + test coverage + e2e in CI.

4. Project-specific conventions and patterns
   - Feature-first architecture: add new feature under `src/features/<feature>` with `hooks/`, `components/`, `pages/` and tests next to code.
   - Data fetching: centralize in `src/lib/api/services/*` and expose hooks in the feature folder; use TanStack Query (react-query) patterns for caching & optimistic updates.
   - Types: prefer `src/types/*` and reference `database.generated.ts` for DB shapes. Update types after adding DB migrations.
   - Supabase usage: prefer typed `supabase` client; use `supabaseUntyped` only when a table is not in generated types (explicit inline comment exists in `src/lib/supabase.ts`).
   - Offline-first: follow existing patterns in `src/lib/offline/*` (priority queues, conflict resolution functions exist and are tested).
   - Tests: Use `fake-indexeddb` & MSW for unit tests that touch offline and network behavior (look at tests under `src/lib/*` and `__tests__`).

5. CI / Secrets / Environment
   - CI (GitHub Actions) uses Node 20. Important secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` are required for builds and Playwright E2E runs (see `.github/workflows/ci.yml`).
   - Playwright tests in CI install browsers with `npx playwright install --with-deps chromium` and run `--project=chromium` for speed.

6. Integration & external points to check before changes
   - Supabase migrations in `/migrations/` and DB type generation (keep `src/types` in sync when changing schema).
   - Storage buckets used by uploads (documents, photos, drawings) configured from README; ensure new uploads respect bucket names.
   - Capacitor mobile integration: `cap:*` scripts in `package.json` (sync/build/run) and platform helpers under `src/lib/native/*`.

7. Typical quick tasks & hints (examples)
   - Adding a column: add SQL migration in `/migrations`, run migrations in Supabase, regenerate or update `src/types/database.generated.ts`, update API service in `src/lib/api/services/*`, add tests in `src/lib/api/*` and unit/e2e where relevant.
   - Writing an E2E test: place file in `e2e/`, reuse seeded user (`npm run seed:test`), use `page.locator()` and `playwright` projects: chromium/firefox/webkit as needed. Visual tests live under `e2e/visual-regression`.
   - Debugging tests locally: run `npm run test:e2e:debug` or `npm run test:e2e:headed` and `npx playwright show-report` after runs.

8. Files to reference for design/standards
   - `CLAUDE.md` (architecture and conventions reference)
   - `README.md` (onboarding & scripts)
   - `OFFLINE_FIRST_ARCHITECTURE.md`, `PERFORMANCE.md`, `SECURITY_REVIEW_COMPLETE.md` (tradeoffs and rationale)

9. Safety & scope rules for AI agents (brief)
   - Do not change DB migrations without an accompanying migration file + tests.
   - Prefer small, focused PRs that include tests and update types where applicable.
   - If the change touches offline sync or contracts (API / DB), add an integration or e2e test that exercises sync or migration behavior.

Questions? If any item is unclear or you want examples converted into QuickFix tasks, tell me which area you want expanded (tests, migration steps, offline patterns, or E2E setup).