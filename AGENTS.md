# Repository Guidelines

## Project Structure & Module Organization
- `App.tsx`: Main React app flow (Home → Styling → Result).
- `components/`: UI components (PascalCase files, default exports). Examples: `Header.tsx`, `ProductCard.tsx`, `Spinner.tsx`, `icons.tsx` (named exports).
- `services/geminiService.ts`: Google GenAI calls and image helpers.
- `types.ts`: Shared enums/interfaces (e.g., `AppScreen`, `Product`, `ProductCategory`).
- `index.tsx` / `index.html`: App entry and Tailwind via CDN.
- `vite.config.ts` / `tsconfig.json`: Build and path aliases (alias `@` → project root).
- `metadata.json`, `constants.ts`: App metadata and constants.

## Build, Test, and Development Commands
- Install: `npm install`
- Run dev server: `npm run dev` (Vite; opens on localhost)
- Production build: `npm run build` (outputs to `dist/`)
- Preview build: `npm run preview`
- Configure API key: create `.env.local` with `GEMINI_API_KEY=...` (gitignored). Vite injects `process.env.GEMINI_API_KEY` and `process.env.API_KEY` for `services/geminiService.ts`.

## Coding Style & Naming Conventions
- Language: TypeScript + React 19 (functional components, `react-jsx`).
- Indentation: 2 spaces; keep lines readable (~100 cols).
- Files: Components `PascalCase.tsx`; utilities/services `camelCase.ts`.
- Types: `PascalCase` for `interface`/`enum`; variables/functions `camelCase`.
- Exports: Default export for single components; named exports for grouped icons.
- Imports: Prefer alias `@/...` for root-relative imports.
- Avoid `any`; use `types.ts` models and narrow types explicitly.

## Testing Guidelines
- No test framework is configured yet. If adding tests, prefer Vitest + React Testing Library.
- Naming: `*.test.ts` / `*.test.tsx` beside code or under `__tests__/`.
- Add a script: `"test": "vitest"` and run with `npm test`.

## Commit & Pull Request Guidelines
- Commits: History lacks a convention; adopt Conventional Commits (e.g., `feat:`, `fix:`, `chore:`).
- PRs: Include summary, linked issues, before/after screenshots (UI), steps to validate, and notes on config/env changes. Update README/AGENTS when behavior or setup changes.

## Security & Configuration Tips
- Do not commit secrets; `.env.local` is already gitignored.
- Never log API keys; keep prompts and responses free of sensitive data.
- Validate user inputs before sending to GenAI; handle failures gracefully in UI and `services/geminiService.ts`.
