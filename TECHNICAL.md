# Technical documentation

## Architecture overview

Rooted is a React Native application built with Expo SDK 54 and Expo Router. It targets iOS, Android, and web from one TypeScript codebase. Supabase provides PostgreSQL data, photo storage, and realtime change notifications.

The application uses a service-oriented architecture:

```text
Screens and components
        |
Query and UI hooks
        |
Static service classes
        |
Supabase PostgreSQL / Storage / Realtime
```

Components do not query Supabase directly. Query hooks in `hooks/queries.ts` call service methods and coordinate TanStack React Query. Services enforce household scope, caching, storage, and error mapping.

## Core technologies

- **Expo SDK 54 and React Native 0.81** - cross-platform application runtime
- **Expo Router 6** - file-based navigation
- **Supabase** - PostgreSQL, Storage, RPC functions, and Realtime
- **TanStack React Query 5** - server-state queries and mutations
- **MMKV** - persistent native response cache
- **localStorage** - persistent web response cache
- **AsyncStorage** - household session and user preferences
- **expo-image** - image rendering and disk/memory caching
- **expo-image-manipulator** - photo resizing and compression
- **Sentry** - error and crash monitoring
- **TypeScript** - strict application types and generated database types

## Project structure

```text
app/                    Expo Router screens and layouts
components/             Reusable and feature components
constants/              Domain configuration and query keys
contexts/               Theme, alerts, and web modal state
errors/                 Domain error mapping
hooks/                  Query and UI hooks
services/               Business logic and platform services
styles/                 Theme tokens
supabase/migrations/    Database migrations
types/                  Domain and generated database types
utils/                  Shared utilities and initialization
__tests__/              Service, component, and integration tests
```

## Service and query flow

Services are static classes such as `PlantService`, `EventService`, `PhotoService`, `TagService`, and `HouseholdService`. Database-facing methods generally follow this sequence:

1. Load the current household session.
2. Build a household-specific key with `CacheKeyBuilder`.
3. Return a valid cached value when available.
4. Query Supabase with `household_id` and entity filters.
5. Store the response using the appropriate `CACHE_TTL`.
6. Map database failures to domain errors.

Example:

```typescript
const session = await HouseholdService.getUserSession();
if (!session?.household_id) {
  throw new Error("No household session found");
}

const cacheKey = CacheKeyBuilder.plant(plantId, session.household_id);
const cached = await CacheService.getCachedResponse<Plant>(cacheKey);
if (cached) {
  return cached;
}

const { data, error } = await supabase
  .from(DB_TABLES.PLANTS)
  .select("*")
  .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
  .eq("id", plantId)
  .single();
```

React Query keys are centralized in `constants/queryKeys.ts`. Mutations invalidate React Query and persistent cache state through `CacheInvalidationService.invalidateOnUserAction(...)`.

## Platform-specific services

Platform differences use Metro module suffixes and are imported without the suffix:

```text
PhotoService.native.ts
PhotoService.web.ts
CacheService.native.ts
CacheService.web.ts
CachedPhotoService.native.ts
CachedPhotoService.web.ts
```

Native builds use filesystem-backed image caching and MMKV. Web uses browser APIs and localStorage.

## Data and household isolation

Supabase PostgreSQL is the source of truth. Core tables include:

- `plants`
- `events`
- `plant_photos`
- `notes`
- `tags`
- `plant_tags`
- `households`
- `household_members`
- `activity_log`

Application services scope records by the current `household_id`. Database row-level security is the second enforcement layer.

Table and frequently used column names are centralized in `constants/domain.ts`. Schema changes belong in `supabase/migrations/`, and generated database types live in `types/Database.ts`.

## Household session and authentication

The welcome flow creates or joins a household. `HouseholdService` persists this application session in AsyncStorage:

```typescript
interface UserSession {
  user_id?: string;
  user_name: string;
  household_id: string;
  role: "admin" | "member";
}
```

This is currently a device-local application identity, not complete account authentication. The Supabase client is configured to persist auth sessions, and `DatabaseService` exposes auth session helpers, but signup, login, recovery, and authenticated household membership are future work.

## Server state and caching

### React Query

Query hooks in `hooks/queries.ts` cover plants, events, photos, tags, statistics, and archived plants. Defaults are centralized in `QUERY_CLIENT_CONFIG`:

- Five-minute default stale time
- Thirty-minute default garbage-collection time
- Exponential retry with a thirty-second maximum delay
- Refetch on reconnect

### Persistent response cache

`CacheService` supplements React Query:

- **Native:** MMKV plus an in-memory map
- **Web:** localStorage plus an in-memory map
- TTL-based expiration
- Pattern invalidation and expired-entry cleanup
- Bounded memory cache

Persistent response caching improves startup and reconnect behavior, but it is not a complete offline-write system. Mutations still require connectivity and there is no mutation queue or conflict resolution.

### Realtime updates

`useRealtimeUpdates` manages one shared Supabase Realtime channel for plants, events, and plant photos. Incoming changes invalidate related React Query keys. The subscription retries channel errors with bounded exponential backoff.

## Photo pipeline

Supabase Storage is the durable photo store. Native and web services share the same database and storage model.

### Upload

1. The user captures or selects a photo.
2. `PhotoProcessingService` creates:
   - an optimized JPEG with a maximum 2048-pixel edge at 0.8 quality;
   - a 300-pixel thumbnail at 0.7 quality.
3. `PhotoService` uploads both files to the `plant-photos` Supabase Storage bucket.
4. A `plant_photos` row stores the cloud URLs, caption, timestamp, household, plant, and optional event.
5. If database persistence fails, `PhotoStorageService` removes uploaded files.
6. Native temporary processing files are deleted.

### Reads and local caching

- List views request thumbnails.
- Full-size images are loaded only for viewers and downloads.
- `expo-image` provides memory/disk caching.
- Native `CachedPhotoService` can retain downloaded photos and thumbnails in bounded filesystem caches.
- Web relies on browser and `expo-image` caching.

### Deletion

Photo deletion removes database records and their corresponding Supabase Storage objects. Storage deletion is batched and retried. Batch deletion deduplicates object names before removal.

## Navigation and responsive UI

The main tab layout contains:

- **Plants** - collection, search, filtering, batch care, and plant details
- **Calendar** - monthly care history with event details
- **Settings** - household, appearance, archive, date/time, data management, and about

Desktop web uses a sidebar and modal detail panels. Narrow web and native platforms use tab and stack navigation. Responsive decisions are centralized through `useBreakpoint()`.

Important routes include:

```text
app/(tabs)/index.tsx
app/(tabs)/calendar.tsx
app/(tabs)/settings.tsx
app/plant/[id].tsx
app/event/[id].tsx
app/add-plant.tsx
app/edit-plant.tsx
app/log-care.tsx
app/edit-care-event.tsx
app/archived-plants.tsx
app/welcome.tsx
```

## Care events

Supported event types include watering, fertilizing, fertigating, pruning, pest spotting, insecticide treatment, repotting, and other custom care. Events support notes, backdating, optional event photos, and type-specific metadata.

`EventService` also provides aggregate statistics and last-event queries. Statistics exist at the service/query layer but are not yet presented as a complete insights feature.

## Preferences and theming

Theme, date format, time format, sorting, filtering, and pinned selections are stored in AsyncStorage. `ThemeContext` exposes semantic theme colors and supports light, dark, and system modes. `DateTimeService` and dayjs provide shared date formatting.

## Monitoring

Sentry initialization is environment-aware. Development diagnostics use the shared logger, while unexpected failures may be reported through `console.error` and Sentry.

## Testing

Jest, ts-jest, and React Native Testing Library cover service and integration behavior. Tests mirror source areas under `__tests__/`.

```bash
npm test
npm run test:watch
npm run test:coverage
```

The current Jest `testMatch` includes service and integration suites. Component tests exist but still need to be added to the default match and expanded across screens and hooks.

## Development and deployment

```bash
npm start          # Standard Expo development server
npm run start:dev  # Development client and development environment
npm run ios
npm run android
npm run web
```

EAS profiles in `eas.json` define development, preview, and production builds. `app.config.js` configures separate development bundle identifiers and schemes.

Supabase environments are managed with:

```bash
npm run db:link:dev
npm run db:link:prod
npm run db:push
```

Public runtime configuration includes the Supabase URL, anonymous key, environment name, and optional Sentry DSN. Secrets must not be embedded in `EXPO_PUBLIC_` variables.

## Known limitations

- No offline mutation queue or conflict resolution
- No complete user account authentication flow
- No backup/restore, export, reminders, or notifications
- Platform release readiness requires continued device and browser QA

See [TASKS.md](TASKS.md) for the maintained backlog.
