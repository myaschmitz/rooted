# Rooted 🌱

A personal plant care tracking app for iPhone built with React Native and Expo. Track your plants' care history, photos, and notes with a simple, intuitive interface.

## Features

### Core Functionality
- **Plant Management**: Add, edit, and organize your plant collection
- **Care Event Logging**: Track watering, fertilizing, repotting, and pruning with easy backdating
- **Photo Documentation**: Take and store photos to document plant progress
- **Plant Notebook**: Keep free-form notes for each plant
- **Health Status Tracking**: Monitor plant health (good/okay/concerning)
- **Location Tracking**: Keep track of which room each plant is in
- **Fertilizer Details**: Log concentration and amount used

### Smart Features
- **Flexible Reminders**: Gentle nudges based on your actual care patterns (not rigid scheduling)
- **Care History**: Visual timeline of all care events
- **Quick Logging**: Default to current date/time with easy backdating options
- **Local Storage**: All data stored locally with SQLite for offline access

## Tech Stack

- **Framework**: React Native with Expo
- **Database**: Expo SQLite for local storage
- **Photo Management**: Expo ImagePicker & FileSystem
- **Navigation**: Expo Router
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
│   ├── log-care.tsx       # Log care event screen
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
3. Set initial health status
4. Add any notes
5. Save to your collection

### Logging Care Events
1. Open a plant's detail page
2. Tap "Log Care Event"
3. Select care type (water, fertilize, repot, etc.)
4. Adjust date/time if backdating
5. Add notes and fertilizer details if applicable
6. Save the event

### Adding Photos
1. From a plant's detail page, tap "Add Photo"
2. Choose from camera roll or take a new photo
3. Add an optional caption
4. Photo is saved locally and linked to the plant

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
