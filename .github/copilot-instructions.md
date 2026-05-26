# Project: Rooted

Plant care tracker. React Native + Expo (iOS, Android, web) on Supabase. Expo Router for navigation, TanStack React Query for server state, MMKV for persistent cache.

## Code style

- TypeScript strict. No `any` unless justified inline.
- Functional components only. No class components.
- Keep comments terse — one short line. No "why we do this" prose. Only comment non-obvious logic.
- Prefer `dayjs` for date math. Never use raw `Date` arithmetic.
- Use named exports for utilities; default export only for screen components.

## Architecture

- Business logic lives in `services/` as static-class singletons (e.g. `PlantService.getAllPlants`). Never call Supabase directly from components.
- Platform-specific code uses `.native.ts` / `.web.ts` suffixes (e.g. `PhotoService.native.ts`). Import without the suffix.
- All Supabase queries must filter by `household_id` from `HouseholdService.getUserSession()`. RLS enforces this server-side too.
- React Query keys live in `constants/queryKeys.ts`. Query hooks live in `hooks/queries.ts`.
- Cache keys are built via `CacheKeyBuilder` — never construct cache key strings inline.
- Mutations must call `CacheInvalidationService.invalidateOnUserAction(action, { entityId })` so MMKV + React Query stay in sync.

## UI

- Use `useTheme()` from `contexts/ThemeContext`. No hardcoded colors. Pull tokens from `styles/theme.ts` (`BaseColors`, `Spacing`, `Typography`, `BorderRadius`, `Shadows`).
- Use `useBreakpoint()` for responsive layout. Web grid vs. mobile list logic should branch on `isDesktop`/`isTablet`.
- Show errors via `useAlert()` from `contexts/AlertContext`. Never use `Alert.alert` directly.
- Images use `expo-image`. For plant photos use `CachedImage` / `PlantThumbnail`.
- Icons come from `lucide-react-native`.

## Patterns to avoid

- Don't leave `console.log` in committed code. `console.error` for unexpected failures is fine.
- Don't fetch inside components — wrap in a hook in `hooks/queries.ts`.
- Don't bypass `CacheKeyBuilder` or skip `CacheInvalidationService` after mutations.
- Don't hardcode `household_id`, table names, or column names — use `DB_TABLES` / `DB_COLUMNS` from `constants/domain.ts`.
- Don't add new top-level files in `app/` without considering Expo Router's file-based routing implications.

## Testing

- Jest + React Native Testing Library. Tests mirror source paths under `__tests__/`.
- Run all tests: `npm test`. Watch mode: `npm run test:watch`. Single test: `npm test -- <pattern>`.

## Useful scripts

- `npm run start:dev` — dev client against the dev Supabase project.
- `npm run db:link:dev` / `db:link:prod` — switch Supabase project.
- `npm run db:push` — apply migrations from `supabase/migrations/`.

## Further context

- High-level architecture and caching strategy: `TECHNICAL.md`.
- Schema: `supabase_schema.sql` and `supabase/migrations/`.
- Outstanding work: `TASKS.md`.
