# Technical Documentation

## Architecture Overview

Rooted is a React Native plant care app built with Expo and Supabase. The architecture follows a service-based pattern with three-layer caching and multi-user household support. The app is designed for offline-first functionality with automatic synchronization.

## Core Technologies

- **React Native + Expo** - Cross-platform mobile framework with file-based routing (Expo Router)
- **Supabase** - PostgreSQL backend with Row Level Security for multi-tenancy
- **TanStack React Query** - Declarative server state management with automatic cache invalidation
- **MMKV** - High-performance persistent key-value storage
- **TypeScript** - Fully typed codebase with generated database types

## Project Structure

```
rooted/
├── app/                    # Screens (Expo Router file-based routing)
├── services/               # Business logic layer
├── hooks/                  # React Query hooks and custom hooks
├── components/             # Reusable UI components
├── types/                  # TypeScript definitions
├── contexts/               # React Context providers
├── constants/              # App constants and config
├── styles/                 # Styling utilities
└── utils/                  # Utility functions
```

## Service Layer Architecture

All database operations flow through service classes that encapsulate Supabase queries and business logic. Services automatically handle household-level multi-tenancy by checking the user session and filtering all queries by `household_id`.

### Service Pattern

Each service follows a consistent pattern:
1. **Session validation** - Verify household session exists
2. **Cache check** - Look for cached data using household-specific keys
3. **Database query** - Fetch from Supabase with household filter
4. **Cache storage** - Store result for future requests
5. **Error handling** - Consistent error messages and logging

```typescript
// Example: PlantService.getAllPlants()
const session = await HouseholdService.getUserSession();
const cacheKey = `plants-list-${session.household_id}`;
const cached = await CacheService.getCachedResponse(cacheKey);
if (cached) return cached;

const { data } = await supabase
  .from('plants')
  .eq('household_id', session.household_id)
  .order('name');

await CacheService.cacheApiResponse(cacheKey, data, 5 * 60 * 1000);
return data;
```

### Key Services

- **PlantService** - CRUD operations for plants with search/filter capabilities
- **EventService** - Care event logging with type-specific metadata (fertilizer concentration, pest severity)
- **PhotoService** - Camera integration, image compression, thumbnail generation, local file management
- **HouseholdService** - Multi-user session management, invite codes, activity logging
- **CacheService** - Dual-layer cache (memory + MMKV) with automatic TTL expiry
- **TagService** - Custom tag management with color coding

## State Management Architecture

### React Query Integration

All server state is managed through TanStack React Query with centralized query keys defined in `constants/queryKeys.ts`. Query hooks are organized in `hooks/queries.ts` for reusability.

**Query Configuration:**
- **staleTime**: 5 minutes - data is considered fresh and won't refetch
- **gcTime**: 30 minutes - cached data retention for offline access
- **retry**: 3 attempts with exponential backoff (max 30s delay)
- **refetchOnWindowFocus**: disabled - manual refresh only
- **refetchOnReconnect**: enabled - sync on network recovery

**Automatic Cache Invalidation:**
Mutations automatically invalidate related queries using a hierarchical key structure:

```typescript
// Creating a plant invalidates the plant list
const createPlant = useMutation({
  mutationFn: PlantService.createPlant,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['plants'] })
  }
})

// Deleting an event invalidates that plant's events and the plant itself
const deleteEvent = useMutation({
  mutationFn: EventService.deleteEvent,
  onSuccess: (_, { plantId }) => {
    queryClient.invalidateQueries({ queryKey: ['events', plantId] })
    queryClient.invalidateQueries({ queryKey: ['plant', plantId] })
  }
})
```

### Custom Hooks Layer

Business logic is encapsulated in custom hooks that compose React Query with local state:

- **usePlantSearch** - Client-side fuzzy search using Fuse.js with configurable search keys (name, type, location)
- **usePlantFiltering** - Tag-based filtering with AsyncStorage persistence for user preferences
- **usePlantSorting** - Multi-criteria sorting (name, last watered) with direction toggle
- **useRealtimeUpdates** - Supabase realtime subscriptions for collaborative updates
- **usePinnedPlants** - Favorite plants management with local persistence

### Theme Management

ThemeContext provides app-wide theming with system preference detection:
- Supports light, dark, and system-auto modes
- Persists preference in AsyncStorage
- Provides semantic color tokens for all UI elements
- Automatically syncs with OS dark mode changes

## Database Architecture

Supabase PostgreSQL with typed schema generated in `types/Database.ts` for full type safety across the codebase.

### Multi-Tenancy via Row Level Security

All tables include `household_id` for data isolation. Supabase RLS policies enforce that users can only access data for their current household session. This is enforced at the database level, not just in the app.

### Schema Design

**plants** - Core entity with optional name, type, location, notes, pinned status, and thumbnail reference

**events** - Polymorphic care events with type-specific fields:
- `fertilizer_concentration` (1/4, 1/2, 1x, 1.5x, 2x) for fertilize/fertigate events
- `pest_severity` (1-10 scale) for pest_spotted events
- `event_id` foreign key links photos to events

**plant_photos** - Local file paths only (no blob storage), with separate thumbnail paths

**tags** + **plant_tags** - Many-to-many relationship for custom categorization with color coding

**households** + **household_members** - Multi-user support with admin/member roles

**activity_log** - Audit trail for accountability (user_name, action, plant_name, timestamp, details)

All tables include `created_at` and `updated_at` timestamps for auditing.

## Navigation Architecture

File-based routing via Expo Router with automatic type-safe navigation:

```
app/
├── _layout.tsx           # Root layout with providers (QueryClient, Theme, AuthGuard)
├── index.tsx            # Redirect to (tabs)
├── (tabs)/
│   ├── _layout.tsx      # Bottom tab navigation
│   ├── index.tsx        # /         → Plant list (My Plants)
│   └── settings.tsx     # /settings → Settings screen
├── plant/
│   └── [id].tsx         # /plant/:id → Dynamic plant detail
├── add-plant.tsx        # /add-plant
├── edit-plant.tsx       # /edit-plant
├── log-care.tsx         # /log-care
├── welcome.tsx          # /welcome   → Onboarding/household selection
└── ...
```

**Provider Hierarchy:**
1. ErrorBoundary - Catches crashes and shows user-friendly error screen
2. QueryClientProvider - React Query instance with configured defaults
3. ThemeProvider - Theme context with system preference sync
4. AuthGuard - Validates household session, redirects to welcome if missing

All navigation is type-safe through auto-generated router types from Expo Router.

## Three-Layer Caching Strategy

The app implements a sophisticated caching system for performance and offline functionality:

### Layer 1: React Query (In-Memory)
- Automatic caching of all query results in memory
- Hierarchical query key structure for granular invalidation
- Optimistic updates for instant UI feedback
- Deduplicates concurrent requests

### Layer 2: MMKV (Persistent)
- High-performance key-value storage (faster than AsyncStorage)
- Stores serialized query results with TTL expiry
- Survives app restarts for true offline capability
- Automatic cleanup of expired entries
- Fallback to pure memory cache if MMKV initialization fails

### Layer 3: CachedImage (Photos)
- Local file storage in `DocumentDirectory/plant_photos/`
- Full-size images + generated thumbnails for list performance
- expo-image-manipulator for JPEG compression (0.8 quality)
- Automatic orphaned file cleanup on photo deletion

**Cache Invalidation Flow:**
1. User performs mutation (e.g., create plant)
2. Optimistic update in React Query cache
3. Supabase mutation executes
4. On success: invalidate React Query keys → clears MMKV cache
5. Next query fetches fresh data and repopulates all cache layers

## Photo Management Architecture

Photos are stored entirely on-device (not in Supabase Storage) to minimize cloud costs and enable instant offline access.

### Photo Workflow

1. **Capture/Select** - expo-image-picker handles camera and photo library access with platform permissions
2. **Process** - expo-image-manipulator compresses and resizes:
   - Full-size: JPEG at 0.8 quality, max 1200px width
   - Thumbnail: 200x200px for list performance
3. **Store** - Files saved to `DocumentDirectory/plant_photos/` with UUID naming
4. **Database** - Only file paths stored in `plant_photos` table
5. **Cleanup** - PhotoService.deletePhoto() removes both files and database record

### File Organization

```
DocumentDirectory/plant_photos/
├── {uuid}.jpg           # Full-size photo
├── {uuid}_thumb.jpg     # Thumbnail
├── {uuid2}.jpg
└── {uuid2}_thumb.jpg
```

### Performance Optimization

- CachedImage component prevents redundant file reads
- Thumbnails loaded in lists, full images only on detail view
- Automatic orphaned file cleanup on photo deletion
- Batch thumbnail generation for new plants

## Multi-User Household System

The app supports collaborative plant care through a household-based multi-tenancy model.

### Session Management

- User selects or creates a household on first launch (welcome screen)
- Current household stored in AsyncStorage as user session
- All service methods automatically filter by session household_id
- No explicit household_id passing required in UI layer

### Household Roles

- **Admin** - Can manage members, generate invite codes, full plant access
- **Member** - Can view and edit plants, log care events

### Invite Flow

```typescript
// 1. Admin generates 6-character alphanumeric code
const code = await HouseholdService.generateInviteCode(householdId)

// 2. Code stored in household_invites table with 7-day expiry

// 3. New user enters code and name on welcome screen
await HouseholdService.joinHousehold(code, userName)

// 4. household_members record created, session established
```

### Activity Logging

All mutations log to `activity_log` table for accountability:
- User name (not user_id, for simplicity)
- Action type (created, updated, deleted)
- Affected plant name
- Timestamp and optional details

This enables "Alex watered Monstera 2 hours ago" type displays.

## Care Event System

Care events are polymorphic entities with type-specific metadata defined in `constants/careTypes.ts`.

### Event Types

- **water** - Standard watering (most common)
- **fertilize** - Fertilizer application without water
- **fertigate** - Water + fertilizer combined
- **repot** - Repotting or soil change
- **prune** - Pruning, trimming, or propagation
- **pest_spotted** - Pest detection with severity rating (1-10 scale)
- **insecticide_spray** - Treatment application

### Type-Specific Fields

Events use optional fields that are relevant only to certain types:

```typescript
{
  plant_id: string
  event_type: 'fertilize' | 'fertigate' | ...
  date: Date
  notes?: string
  
  // Only for fertilize/fertigate events
  fertilizer_concentration?: '1/4' | '1/2' | '1x' | '1.5x' | '2x'
  
  // Only for pest_spotted events
  pest_severity?: 1-10
}
```

### Event-Photo Linking

Photos can optionally link to events via `event_id` foreign key. This enables:
- "View photos from this watering session"
- "Show before/after photos of repotting"
- Automatic photo filtering by event type

### Last Event Tracking

EventService provides `getLastEventByType(plantId, eventType)` for displaying:
- "Last watered 3 days ago"
- "Last fertilized 2 weeks ago"

This uses indexed queries for performance across large event histories.

## User Preferences & Localization

User preferences are stored in AsyncStorage via the `useSettings` hook and accessed through DateTimeService for consistent formatting.

### Configurable Settings

- **Theme**: light, dark, or system (auto-detects OS preference)
- **Date format**: MM/DD/YYYY, DD/MM/YYYY, or YYYY/MM/DD
- **Time format**: 12-hour (AM/PM) or 24-hour

### DateTimeService

Centralized date/time formatting that respects user preferences:

```typescript
DateTimeService.formatDate(date)      // Uses user's date format preference
DateTimeService.formatTime(date)      // Uses user's time format preference
DateTimeService.formatDateTime(date)  // Combines both
DateTimeService.formatRelative(date)  // "3 days ago", "2 hours ago"
```

All date displays in the UI flow through DateTimeService to ensure consistency and respect user preferences.

## Testing Strategy

Jest-based testing with React Native Testing Library for component testing and integration tests.

### Test Structure

```
__tests__/
├── components/          # Component unit tests
├── services/           # Service layer integration tests
├── integration/        # End-to-end flows
└── utils/             # Test helpers and mocks
```

### Testing Approach

- **Services** - Test Supabase queries, caching behavior, error handling
- **Components** - Test UI rendering, user interactions, accessibility
- **Integration** - Test complete user flows (add plant → log care → view history)

### Test Configuration

- Jest with jest-expo preset for React Native compatibility
- Mock Supabase client in test environment
- Mock MMKV for cache testing
- React Native Testing Library for component queries

Run tests with:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode for development
npm run test:coverage # Generate coverage report
```

## Build & Deployment

### Development

```bash
npm start              # Start Expo dev server with QR code
npm run ios           # Build and run on iOS simulator
npm run android       # Build and run on Android emulator
```

### Production Builds

Expo Application Services (EAS) handles cloud builds for both platforms:

```bash
# iOS preview build (development profile)
npm run build:dev -- --platform ios

# Production builds
npm run build:prod -- --platform ios
npm run build:prod -- --platform android
```

Build profiles defined in `eas.json` with platform-specific configurations.

### Environment Variables

Required environment variables in `.env`:

- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous public key
- `EXPO_PUBLIC_ENVIRONMENT` - dev/staging/production flag

Variables prefixed with `EXPO_PUBLIC_` are embedded in the app bundle and accessible via `expo-constants`.
