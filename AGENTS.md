# Repository Guidelines

## Project Structure & Module Organization
- App flow: `App.tsx` orchestrates screens (Home → Styling → Result).
- UI: `components/` (PascalCase files, default exports). Icons live in `components/icons.tsx` (named exports).
- Services: `services/geminiService.ts` for Google GenAI calls + image helpers.
- Types: `types.ts` shared `interface`/`enum` (e.g., `AppScreen`, `Product`).
- Entry: `index.tsx` / `index.html` (Tailwind via CDN).
- Build config: `vite.config.ts` and `tsconfig.json` with alias `@` → project root.
- App data: `metadata.json`, `constants.ts`.

## Build, Test, and Development Commands
- Install deps: `npm install`.
- Run dev server: `npm run dev` (Vite; opens localhost).
- Production build: `npm run build` → outputs to `dist/`.
- Preview build: `npm run preview`.
- Tests: No framework configured. If adding tests, install Vitest + RTL and add script: `"test": "vitest"`, then run `npm test`.

## Coding Style & Naming Conventions
- Language: TypeScript + React 19 (functional components, `react-jsx`).
- Indentation: 2 spaces; keep lines readable (~100 cols).
- Naming: Components `PascalCase.tsx`; utilities/services `camelCase.ts`.
- Exports: Default export for single components; named exports for grouped icons.
- Imports: Prefer `@/...` root‑relative paths.
- Types: Avoid `any`; reuse models in `types.ts` and narrow explicitly.

## Testing Guidelines
- Preferred stack: Vitest + React Testing Library.
- Naming: `*.test.ts` / `*.test.tsx` beside code or under `__tests__/`.
- Scope: Unit-test components, services, and critical flows; mock network calls.
- Coverage: Aim for meaningful coverage on core paths; avoid flaky UI timing.

## Commit & Pull Request Guidelines
- Commits: Use Conventional Commits (e.g., `feat:`, `fix:`, `chore:`). Keep messages imperative and scoped.
- PRs: Provide summary, linked issues, before/after screenshots (UI), steps to validate, and notes on config/env changes. Update README/AGENTS when setup or behavior changes.

## Security & Configuration Tips
- Secrets: Do not commit secrets. Use `.env.local` with `GEMINI_API_KEY=...` (gitignored).
- Env access: Vite injects `process.env.GEMINI_API_KEY` and `process.env.API_KEY` for `services/geminiService.ts`.
- Safety: Never log API keys; validate inputs before GenAI calls; handle failures gracefully in UI and services.

