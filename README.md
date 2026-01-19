# Rooted

A full-featured plant care tracking app for iOS built with React Native and Expo. Designed for plant enthusiasts to document care history, organize collections, and collaborate with household members.

## Key Features

**Plant Management**
- Full CRUD operations with optional naming and custom locations
- Tagging system with custom colors for organizing collections
- Pin favorite plants, search with fuzzy matching, sort and filter by multiple criteria
- Batch care mode for logging events across multiple plants simultaneously

**Care Event Tracking**
- Multiple event types: watering, fertilizing, fertigating, pruning, pest management, repotting
- Event-specific metadata (fertilizer strength, pest severity ratings)
- Full edit/delete capabilities with backdating support

**Photo Documentation**
- Camera and library integration with multi-photo support per plant
- Event-linked photos with automatic thumbnail generation and caching
- Gallery view with batch selection and deletion

**Multi-User Support**
- Household system with invite codes for shared plant collections
- Member management with admin controls

**Customization**
- Light/dark/system theme options
- Configurable date and time formats
- Persistent user preferences

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo SDK 53 |
| Navigation | Expo Router (file-based) |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| State Management | TanStack React Query |
| Local Storage | AsyncStorage |
| Language | TypeScript |

## Architecture Highlights

- **Service-oriented architecture** with dedicated services for plants, events, photos, tags, and households
- **Optimistic updates** with React Query for responsive UI
- **Smart caching** with automatic invalidation and real-time sync subscriptions
- **Type-safe** end-to-end with TypeScript interfaces for all data models

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios
```

### Prerequisites
- Node.js v16+
- Expo CLI
- iOS Simulator or physical device

## Project Structure

```
rooted/
├── app/                    # Screens (Expo Router)
│   ├── (tabs)/            # Tab navigation
│   ├── plant/[id].tsx     # Dynamic plant detail
│   └── *.tsx              # Feature screens
├── services/              # Business logic layer
├── hooks/                 # React Query hooks
├── components/            # Reusable UI components
└── types/                 # TypeScript definitions
```

## License

MIT
