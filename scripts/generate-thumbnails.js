// Quick script to generate thumbnails for existing photos
// Run this in Expo development console or add it to a temporary screen

import { PhotoService } from '../services/PhotoService';
import { Alert } from 'react-native';

export const runThumbnailGeneration = async () => {
  try {
    console.log('Starting thumbnail generation...');
    
    const result = await PhotoService.generateThumbnailsForExistingPhotos();
    
    console.log('Thumbnail generation complete!');
    console.log(`✅ Success: ${result.success} thumbnails created`);
    console.log(`❌ Failed: ${result.failed} photos failed`);
    console.log(`⏭️ Skipped: ${result.skipped} photos skipped`);
    
    Alert.alert(
      'Thumbnails Generated',
      `Success: ${result.success}\nFailed: ${result.failed}\nSkipped: ${result.skipped}`
    );
    
    return result;
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    Alert.alert('Error', error.message);
    throw error;
  }
};

// To use: import and call runThumbnailGeneration() from any component