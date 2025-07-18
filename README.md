# Rooted 🌱

A personal plant care tracking app for iPhone built with React Native and Expo. Track your plants' care history, photos, and notes with a simple, intuitive interface.

## Features

### Core Functionality
- **Plant Management**: Add, edit, and organize your plant collection
- **Care Event Logging**: Track watering, fertilizing, repotting, and pruning with easy backdating
- **Care Event Editing**: Modify care history entries, including notes and fertilizer details
- **Photo Documentation**: Take and store photos to document plant progress with full-screen viewing
- **Plant Data Editing**: Update plant names, types, locations, health status, and notes
- **Health Status Tracking**: Monitor plant health (excellent/good/okay/poor/concerning/critical)
- **Location Tracking**: Keep track of which room each plant is in
- **Fertilizer Details**: Log concentration and amount used

### Smart Features
- **Full-Screen Photo Viewing**: Click any photo for full-screen view with swipe to close
- **Simplified Photo Management**: Delete photos with a single tap (red X button)
- **Auto-Refresh**: Plant lists update automatically when adding new plants or photos
- **Flexible Reminders**: Gentle nudges based on your actual care patterns (not rigid scheduling)
- **Care History**: Visual timeline of all care events with edit functionality
- **Quick Logging**: Default to current date/time with easy backdating options
- **Local Storage**: All data stored locally with SQLite for offline access

## Tech Stack

- **Framework**: React Native with Expo
- **Database**: Expo SQLite for local storage
- **Photo Management**: Expo ImagePicker & FileSystem
- **Navigation**: Expo Router
- **Icons**: Lucide React Native
- **State Management**: React Hooks
- **Storage**: AsyncStorage for app settings

## Getting Started

### Prerequisites
- Node.js (v16 or later)
- npm or yarn
- Expo CLI
- iOS Simulator or physical iPhone for testing

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd rooted
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on iOS:
   ```bash
   npm run ios
   ```

### Development Build

For testing on a physical device:

```bash
expo install --fix
eas build --profile development --platform ios
```

## Project Structure

```
rooted/
├── app/                    # Main app screens (Expo Router)
│   ├── _layout.tsx        # Root navigation layout
│   ├── index.tsx          # Home screen (plant list)
│   ├── add-plant.tsx      # Add new plant screen
│   ├── edit-plant.tsx     # Edit plant information screen
│   ├── log-care.tsx       # Log care event screen
│   ├── edit-care-event.tsx# Edit care event screen
│   └── plant/
│       └── [id].tsx       # Plant detail screen
├── services/              # Data layer services
│   ├── DatabaseService.ts # SQLite database setup
│   ├── PlantService.ts    # Plant CRUD operations
│   ├── CareEventService.ts# Care event management
│   ├── PhotoService.ts    # Photo management
│   └── NotesService.ts    # Notes management
├── types/                 # TypeScript type definitions
│   └── Plant.ts          # Core data types
└── assets/               # Static assets (icons, images)
```

## Database Schema

The app uses SQLite with tables designed for future cloud sync:

- **plants**: Core plant information
- **care_events**: All care activities (water, fertilize, etc.)
- **plant_photos**: Photo metadata and file paths
- **plant_notes**: Free-form notes for each plant

All tables include UUID primary keys and sync tracking columns.

## Usage

### Adding a Plant
1. Tap the "+" button on the home screen
2. Enter plant name, type, and optional location
3. Set initial health status (excellent/good/okay/poor/concerning/critical)
4. Add any notes
5. Save to your collection

### Editing Plant Information
1. Open a plant's detail page
2. Tap the "✏️ Edit" button in the header
3. Modify any plant details (name, type, location, health status, notes)
4. Update plant photo if desired
5. Save changes

### Logging Care Events
1. Open a plant's detail page
2. Tap "Log Care Event"
3. Select care type (water, fertilize, repot, etc.)
4. Adjust date/time if backdating
5. Add notes and fertilizer details if applicable
6. Save the event

### Editing Care Events
1. From a plant's detail page, find the care event in the history
2. Tap the "✏️" button next to the care event
3. Modify care type, health status, notes, or fertilizer details
4. Save changes

### Adding and Managing Photos
1. From a plant's detail page, tap "📷 Add Photo"
2. Choose from camera roll or take a new photo
3. Add an optional caption
4. Photo is saved locally and linked to the plant
5. Tap any photo for full-screen viewing
6. Delete photos by tapping the red "✕" button on the photo

## Future Enhancements

- Cloud sync capability
- Reminder notifications based on care patterns
- Care analytics and insights
- Plant care recommendations
- Multi-user support
- Export/backup functionality

## Contributing

This is a personal project, but suggestions and feedback are welcome! Please open an issue to discuss any changes.

## License

MIT License - see LICENSE file for details

## Support

For questions or issues, please open a GitHub issue or contact the maintainer.
