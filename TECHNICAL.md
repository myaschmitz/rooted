# Technical Documentation

## Architecture Overview

Rooted is built with a modern React Native architecture designed for maintainability and future extensibility. The app uses a service-based data layer with local SQLite storage, prepared for eventual cloud synchronization.

## Tech Stack Details

### Core Framework
- **React Native**: 0.76.1
- **Expo SDK**: ~53.0.0
- **Expo Router**: File-based navigation with nested routes
- **TypeScript**: Full type safety throughout the application

### Database & Storage
- **Expo SQLite**: Primary data storage with FTS (Full-Text Search) enabled
- **AsyncStorage**: App settings and preferences
- **Expo FileSystem**: Local photo storage management

### Media & Device Access
- **Expo ImagePicker**: Camera and photo library access
- **Expo FileSystem**: File management for plant photos

### Development Tools
- **Babel**: ES6+ transpilation with Expo presets
- **ESLint**: Code quality and consistency
- **TypeScript**: Static type checking

## Database Design

### Schema Philosophy
The database is designed with cloud synchronization in mind:

- **UUID Primary Keys**: Instead of auto-increment integers for global uniqueness
- **Audit Columns**: `created_at`, `updated_at` for change tracking
- **Sync Tracking**: `synced` boolean for cloud sync status
- **Soft Deletes**: Prepared for sync conflict resolution

### Tables

#### Plants Table
```sql
CREATE TABLE plants (
  id TEXT PRIMARY KEY,           -- UUID
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT,
  health_status TEXT DEFAULT 'good',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced INTEGER DEFAULT 0
);
```

#### Events Table
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,           -- UUID
  plant_id TEXT NOT NULL,        -- Foreign key to plants
  event_type TEXT NOT NULL,      -- 'water', 'fertilize', 'fertigate', 'repot', etc.
  date TEXT NOT NULL,            -- ISO 8601 datetime
  notes TEXT,
  fertilizer_concentration TEXT,
  fertilizer_amount TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced INTEGER DEFAULT 0,
  FOREIGN KEY (plant_id) REFERENCES plants (id) ON DELETE CASCADE
);
```

#### Plant Photos Table
```sql
CREATE TABLE plant_photos (
  id TEXT PRIMARY KEY,           -- UUID
  plant_id TEXT NOT NULL,        -- Foreign key to plants
  file_path TEXT NOT NULL,       -- Local file system path
  caption TEXT,
  taken_at TEXT NOT NULL,        -- When photo was taken
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced INTEGER DEFAULT 0,
  FOREIGN KEY (plant_id) REFERENCES plants (id) ON DELETE CASCADE
);
```

#### Plant Notes Table
```sql
CREATE TABLE plant_notes (
  id TEXT PRIMARY KEY,           -- UUID
  plant_id TEXT NOT NULL,        -- Foreign key to plants
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced INTEGER DEFAULT 0,
  FOREIGN KEY (plant_id) REFERENCES plants (id) ON DELETE CASCADE
);
```

## Service Layer Architecture

### Design Principles
- **Single Responsibility**: Each service handles one domain
- **Consistent Interface**: All services follow similar patterns
- **Error Handling**: Comprehensive error catching and logging
- **Type Safety**: Full TypeScript integration

### Service Classes

#### DatabaseService
- **Purpose**: Database initialization and connection management
- **Key Methods**: `getDatabase()`, `initializeTables()`, `resetDatabase()`
- **Singleton Pattern**: Ensures single database connection

#### PlantService
- **Purpose**: Plant CRUD operations
- **Key Methods**: `getAllPlants()`, `createPlant()`, `updatePlant()`, `deletePlant()`
- **Features**: Search, filtering by location/health status

#### EventService
- **Purpose**: Event management
- **Key Methods**: `createEvent()`, `getEventsByPlantId()`, `getEventStats()`
- **Features**: Event history, statistics, last event tracking

#### PhotoService
- **Purpose**: Photo capture and storage management
- **Key Methods**: `pickAndSavePhoto()`, `takeAndSavePhoto()`, `deletePhoto()`
- **Features**: Local file management, cleanup utilities

#### NotesService
- **Purpose**: Plant notes management
- **Key Methods**: `createNote()`, `updateNote()`, `getNotesByPlantId()`
- **Features**: Full-text search capabilities

## File Management Strategy

### Photo Storage
- **Location**: `${FileSystem.documentDirectory}plant_photos/`
- **Naming**: UUID-based filenames to prevent conflicts
- **Format**: JPEG with 0.8 quality for size optimization
- **Cleanup**: Orphaned file detection and removal

### File Organization
```
DocumentDirectory/
└── plant_photos/
    ├── {uuid-1}.jpg
    ├── {uuid-2}.jpg
    └── ...
```

## Navigation Architecture

### Expo Router Structure
- **File-based routing**: Routes defined by file structure in `/app`
- **Dynamic routes**: `[id].tsx` for parameterized routes
- **Nested layouts**: `_layout.tsx` for navigation configuration

### Route Structure
```
/                    -> app/index.tsx (Home/Plant List)
/add-plant          -> app/add-plant.tsx
/log-care           -> app/log-care.tsx
/plant/[id]         -> app/plant/[id].tsx (Plant Details)
```

## State Management

### Approach
- **Local State**: React hooks (`useState`, `useEffect`) for component state
- **No Global Store**: Simplicity over complexity for initial version
- **Data Fetching**: Direct service calls with loading states
- **Future**: Redux/Zustand consideration for complex state needs

## Performance Considerations

### Database
- **Indexes**: Strategic indexes on frequently queried columns
- **Pagination**: Implemented for large datasets (photos, events)
- **Connection Pooling**: Single database connection with proper cleanup

### UI/UX
- **Lazy Loading**: Images and large lists
- **Optimistic Updates**: Immediate UI feedback
- **Error Boundaries**: Graceful error handling
- **Refresh Control**: Pull-to-refresh on list screens

## Security & Privacy

### Data Storage
- **Local Only**: All data stored locally on device
- **No Analytics**: No tracking or analytics services
- **Permissions**: Minimal required permissions (camera, photo library)

### Future Cloud Sync Considerations
- **End-to-End Encryption**: Planned for cloud storage
- **Authentication**: User account management
- **Conflict Resolution**: Sync conflict handling strategies

## Development Workflow

### Code Organization
- **TypeScript**: Strict mode enabled
- **ESLint**: Consistent code style
- **Component Structure**: Functional components with hooks
- **Error Handling**: Comprehensive try-catch blocks

### Testing Strategy (Future)
- **Unit Tests**: Service layer testing
- **Integration Tests**: Database operations
- **E2E Tests**: Critical user flows
- **Testing Framework**: Jest + React Native Testing Library

## Build & Deployment

### Development
```bash
npm start          # Start Expo development server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
```

### Production Build
```bash
eas build --profile production --platform ios
```

### Development Build (for device testing)
```bash
eas build --profile development --platform ios
```

## Future Technical Enhancements

### Planned Features
1. **Cloud Sync**: Firebase/Supabase integration
2. **Offline Support**: Enhanced offline capabilities
3. **Push Notifications**: Care reminders
4. **Data Export**: JSON/CSV export functionality
5. **Performance Monitoring**: Crash reporting and analytics
6. **Testing Suite**: Comprehensive test coverage

### Scalability Considerations
- **Database Migration System**: Version-controlled schema changes
- **Modular Architecture**: Plugin-based feature system
- **Code Splitting**: Bundle optimization
- **Memory Management**: Image caching and cleanup

## Dependencies

### Core Dependencies
```json
{
  "expo": "~52.0.0",
  "expo-router": "~4.0.0",
  "expo-sqlite": "~15.0.0",
  "expo-image-picker": "~16.0.0",
  "expo-file-system": "~18.0.0",
  "react-native-uuid": "^2.0.2"
}
```

### Development Dependencies
```json
{
  "@types/react": "~18.3.0",
  "typescript": "^5.3.0",
  "@babel/core": "^7.25.2"
}
```

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure proper async/await handling
2. **File Permissions**: Check camera and photo library permissions
3. **Build Errors**: Clear Expo cache and reinstall dependencies
4. **Type Errors**: Ensure all service responses are properly typed

### Debug Commands
```bash
expo doctor           # Check for common issues
expo install --fix    # Fix dependency versions
npx expo customize    # Customize Expo configuration
```
