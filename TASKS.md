# Project tasks

Last reviewed: August 1, 2026

## Current capabilities

### Platform and infrastructure

- [x] Expo SDK 54 application for iOS, Android, and web
- [x] Expo Router navigation with responsive web layouts
- [x] Supabase PostgreSQL backend with household-scoped data
- [x] Supabase Storage for full-size photos and thumbnails
- [x] Supabase Realtime cache updates
- [x] TanStack React Query server-state management
- [x] MMKV native cache and localStorage web cache
- [x] Sentry error and crash monitoring

### Plants and care

- [x] Plant create, edit, archive, restore, and delete flows
- [x] Locations, custom tags, pinned plants, search, sorting, and filtering
- [x] Batch care logging
- [x] Care event create, edit, delete, and backdating
- [x] Event-specific fertilizer and pest metadata
- [x] Monthly care calendar and event detail view

### Photos

- [x] Plant and event-associated photos
- [x] Camera, media library, and multi-photo selection
- [x] Full-size image optimization and thumbnail generation
- [x] Cloud upload with rollback cleanup
- [x] Native and web photo viewers with carousel navigation
- [x] Thumbnail selection, download, and batch deletion
- [x] Local image caching

### Households and settings

- [x] Household create/join flow and locally persisted household session
- [x] Household member and role management
- [x] Theme and date/time preferences
- [x] About section
- [x] Destructive data-management controls

## Near-term backlog

### Reliability and maintainability

- [ ] Add an offline mutation queue for writes made without a network connection
- [ ] Define conflict resolution for concurrent household edits
- [ ] Add backup/restore and data export
- [ ] Expand UI and hook coverage and include component tests in the default Jest match
- [ ] Replace remaining broad `any` types in services, queries, and realtime subscriptions
- [ ] Consolidate remaining raw date operations through dayjs and DateTimeService
- [ ] Remove remaining hardcoded UI colors in favor of theme tokens
- [ ] Update the deprecated ts-jest `isolatedModules` configuration

### Care features

- [ ] Filter event history by event type and date range
- [ ] Surface existing care statistics in the UI
- [ ] Add care streaks and pattern insights
- [ ] Create care reminders based on history or a user-defined schedule
- [ ] Add notification preferences
- [ ] Add plant growth tracking

### Photo features

- [ ] Add photo caption editing to the UI
- [ ] Add crop and edit controls
- [ ] Add system sharing
- [ ] Profile and optimize photo memory use for large collections

### Product and performance

- [ ] Add a help screen
- [ ] Add virtualized or incremental loading for large plant and event lists
- [ ] Add user-facing cache and orphaned-data cleanup tools
- [ ] Complete release QA across iOS, Android, and web

## Authentication and identity

The current household session is stored locally and is not a full user account. Supabase client session support exists, but the product does not yet provide account signup, login, recovery, or cross-device identity.

- [ ] Choose account and guest/anonymous identity behavior
- [ ] Implement signup, login, logout, and account recovery
- [ ] Associate household memberships with authenticated users
- [ ] Define migration for existing locally identified household members

## Future features

### Smart care

- [ ] AI-assisted plant identification
- [ ] Plant health analysis from photos
- [ ] Care recommendation engine
- [ ] Weather-aware care suggestions
- [ ] External plant database integration

### Social

- [ ] Share plants outside a household
- [ ] Community care tips
- [ ] Care challenges and goals
- [ ] Plant trading or exchange

### Analytics

- [ ] Care pattern analysis
- [ ] Growth trends
- [ ] Health correlation insights
- [ ] Care effectiveness metrics

### Platform extensions

- [ ] iOS and Android widgets
- [ ] Apple Watch companion
- [ ] Platform-specific notification actions

## Current limitations

- Writes require a working network connection; cached reads do not provide a complete offline workflow.
- Household identity is device-local rather than a full authenticated account.
- Reminders, notifications, export, and restore are not implemented.
- Platform projects exist, but production readiness still requires device and browser QA.

## Development priorities

1. Protect data integrity and complete offline/conflict behavior.
2. Establish durable user identity and backup/export.
3. Improve care workflows with filtering, reminders, and insights.
4. Expand automated coverage and platform QA.
5. Treat AI and social features as later product work.
