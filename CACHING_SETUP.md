# Caching

The app has two caches with separate jobs:

| Cache | What it holds | Where |
|---|---|---|
| **React Query** | All database data: plants, events, photos (rows), tags, lineage | In memory, `hooks/queries.ts` |
| **CachedPhotoService** | Downloaded image files, with their metadata in MMKV | On disk, `services/CachedPhotoService.*` |

React Query is the **only** cache for database data. Service methods
(`PlantService.getAllPlants`, `TagService.getTagsByPlantIds`, …) always read
from Supabase; they never return cached rows. Don't add MMKV/`CacheService`
caching to a service read — a second data cache can't be invalidated in step
with React Query and brings back stale screens.

## Invalidation

Every write goes through `CacheInvalidationService.invalidate(action, target)`:

```ts
CacheInvalidationService.invalidate("photo_added", { plantId });
CacheInvalidationService.invalidate("plant_propagated", {
  plantId: child.id,
  relatedPlantIds: [parentId, previousParentId],
});
```

`keysFor(action, target)` in `services/CacheInvalidationService.ts` is the one
map from "what changed" to "which queries are stale". It is used by:

- **Service mutations** — called right after the database write, so direct
  service calls (not just mutation hooks) refresh the UI.
- **Realtime** (`hooks/useRealtimeUpdates.ts`) — changes made by other
  household members on `plants`, `events`, `plant_photos`, `tags` and
  `plant_tags` go through the same map.

Mutation hooks in `hooks/queries.ts` don't invalidate on their own; they only
seed (`setQueryData`) or drop (`removeQueries`) entries they already know.

When you add a query, add its key to `constants/queryKeys.ts` and to every
action in `keysFor` whose writes change its data. `__tests__/services/CacheInvalidationService.test.ts`
covers the important cases.

`invalidate` doesn't wait for refetches, so it never slows a mutation down.

## Freshness outside realtime

- **App resume**: `useRefreshOnAppResume` marks everything stale when the app
  returns after 30s+ in the background, since realtime events sent while the
  app was backgrounded are lost.
- **Pull to refresh** on the plants list refetches every query on screen.
- **Household change**: joining, creating or leaving a household drops the
  whole React Query cache (query keys aren't household-scoped).

## Realtime setup

Realtime only delivers changes for tables in the `supabase_realtime`
publication. Make sure `plants`, `events`, `plant_photos`, `tags` and
`plant_tags` are all enabled (Supabase dashboard → Database → Publications, or
`alter publication supabase_realtime add table …`).

## Image cache

`CachedPhotoService` keeps up to 100MB of downloaded images and falls back to
the network URL if a cached file is missing. Use the `CachedImage` / `PlantPhotoImage` / `PlantThumbnailImage`
components to render photos through it.
