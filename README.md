# Rooted

Rooted is a plant care tracker for iOS, Android, and web built with React Native and Expo. It helps households organize plant collections, record care, document growth with photos, and share a common care history.

## Features

### Plant management

- Create, edit, archive, restore, and delete plants
- Organize plants by location and custom tags
- Pin favorites and search, sort, or filter the collection
- Log care for multiple plants in one batch

### Care tracking

- Record watering, fertilizing, fertigating, pruning, pest treatment, repotting, and custom events
- Add event-specific details such as fertilizer concentration and pest severity
- Backdate, edit, and delete care events
- Browse care history from plant details or the monthly calendar

### Photos

- Capture or select multiple plant and event photos
- Generate optimized full-size images and thumbnails before upload
- Store photos in Supabase Storage and cache them locally
- Browse photos in a swipeable viewer, download them, choose a plant thumbnail, or delete them in batches

### Households and preferences

- Create or join a shared household with a household code
- Manage members and household settings
- Receive realtime updates when shared data changes
- Choose light, dark, or system theme and preferred date/time formats

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | React Native + Expo SDK 54 |
| Navigation | Expo Router |
| Backend | Supabase PostgreSQL, Storage, and Realtime |
| Server state | TanStack React Query |
| Persistent cache | MMKV on native, localStorage on web |
| Preferences | AsyncStorage |
| Monitoring | Sentry |
| Language | TypeScript |

## Architecture

- UI code reads and mutates server state through hooks in `hooks/queries.ts`.
- Business logic and Supabase access live in static service classes under `services/`.
- Every data query is scoped to the current household.
- React Query, `CacheService`, and `CachedPhotoService` coordinate data and image caching.
- Native and web differences use `.native.ts` and `.web.ts` implementations.

See [TECHNICAL.md](TECHNICAL.md) for implementation details and [TASKS.md](TASKS.md) for current and future work.

## Getting started

### Prerequisites

- A current Node.js LTS release
- npm
- A configured Supabase project
- Xcode for local iOS builds or Android Studio for local Android builds

### Install and run

```bash
npm install

# Expo development server
npm start

# Development client connected to the development Supabase project
npm run start:dev

# Platform targets
npm run ios
npm run android
npm run web
```

The app expects the public Supabase URL and anonymous key through its environment configuration. Use the database scripts in `package.json` to link or push Supabase migrations.

## Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Project structure

```text
app/                  Expo Router screens
components/           Reusable and feature UI
constants/            Domain constants and query keys
contexts/             Theme, alerts, and web modal state
hooks/                Query and UI hooks
services/             Business logic, storage, and caching
supabase/migrations/  Database migrations
types/                Application and generated database types
__tests__/            Service, component, and integration tests
```

## License

MIT
