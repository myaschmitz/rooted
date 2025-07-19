import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import uuid from 'react-native-uuid';
import { PlantPhoto } from '../types/Plant';
import { DatabaseService } from './DatabaseService';

export class PhotoService {
  private static readonly PHOTOS_DIR = `${FileSystem.documentDirectory}plant_photos/`;

  static async ensurePhotosDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.PHOTOS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.PHOTOS_DIR, { intermediates: true });
    }
  }

  static async getPhotosByPlantId(plantId: string): Promise<PlantPhoto[]> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM plant_photos WHERE plant_id = ? ORDER BY taken_at DESC',
      [plantId]
    );
    return result.map(row => ({
      ...(row as any),
      synced: Boolean((row as any).synced)
    })) as PlantPhoto[];
  }

  static async pickAndSavePhoto(plantId: string, caption?: string): Promise<PlantPhoto | null> {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access camera roll is required!');
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        return null;
      }

      return await this.savePhoto(plantId, result.assets[0].uri, caption);
    } catch (error) {
      console.error('Error picking photo:', error);
      throw error;
    }
  }

  static async takeAndSavePhoto(plantId: string, caption?: string): Promise<PlantPhoto | null> {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access camera is required!');
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        return null;
      }

      return await this.savePhoto(plantId, result.assets[0].uri, caption);
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  }

  static async takePhoto(): Promise<{ uri: string } | null> {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access camera is required!');
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        return null;
      }

      return { uri: result.assets[0].uri };
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  }

  static async pickPhoto(): Promise<{ uri: string } | null> {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access camera roll is required!');
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        return null;
      }

      return { uri: result.assets[0].uri };
    } catch (error) {
      console.error('Error picking photo:', error);
      throw error;
    }
  }

  static async savePhoto(plantId: string, sourceUri: string, caption?: string): Promise<PlantPhoto> {
    await this.ensurePhotosDirectory();

    const photoId = uuid.v4() as string;
    const fileName = `${photoId}.jpg`;
    const filePath = `${this.PHOTOS_DIR}${fileName}`;

    // Copy file to app's documents directory
    await FileSystem.copyAsync({
      from: sourceUri,
      to: filePath,
    });

    const now = new Date().toISOString();
    const photo: PlantPhoto = {
      id: photoId,
      plant_id: plantId,
      file_path: filePath,
      caption: caption,
      taken_at: now,
      created_at: now,
      updated_at: now,
      synced: false,
    };

    // Save to database
    const db = await DatabaseService.getDatabase();
    await db.runAsync(
      `INSERT INTO plant_photos (id, plant_id, file_path, caption, taken_at, created_at, updated_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [photo.id, photo.plant_id, photo.file_path, photo.caption || null,
       photo.taken_at, photo.created_at, photo.updated_at, photo.synced ? 1 : 0]
    );

    return photo;
  }

  static async updatePhotoCaption(photoId: string, caption: string): Promise<PlantPhoto | null> {
    const db = await DatabaseService.getDatabase();
    const now = new Date().toISOString();

    const currentPhoto = await this.getPhotoById(photoId);
    if (!currentPhoto) return null;

    const updatedPhoto = {
      ...currentPhoto,
      caption,
      updated_at: now,
      synced: false,
    };

    await db.runAsync(
      'UPDATE plant_photos SET caption = ?, updated_at = ?, synced = ? WHERE id = ?',
      [caption, now, 0, photoId]
    );

    return updatedPhoto;
  }

  static async getPhotoById(id: string): Promise<PlantPhoto | null> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getFirstAsync('SELECT * FROM plant_photos WHERE id = ?', [id]);
    if (!result) return null;
    return {
      ...(result as any),
      synced: Boolean((result as any).synced)
    } as PlantPhoto;
  }

  static async deletePhoto(photoId: string): Promise<boolean> {
    try {
      const photo = await this.getPhotoById(photoId);
      if (!photo) return false;

      // Delete file from filesystem
      const fileInfo = await FileSystem.getInfoAsync(photo.file_path);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(photo.file_path);
      }

      // Delete from database
      const db = await DatabaseService.getDatabase();
      const result = await db.runAsync('DELETE FROM plant_photos WHERE id = ?', [photoId]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }

  static async getAllPhotos(): Promise<PlantPhoto[]> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getAllAsync('SELECT * FROM plant_photos ORDER BY taken_at DESC');
    return result.map(row => ({
      ...(row as any),
      synced: Boolean((row as any).synced)
    })) as PlantPhoto[];
  }

  static async cleanupOrphanedPhotos(): Promise<void> {
    try {
      // Get all photos from database
      const photos = await this.getAllPhotos();
      
      // Check which files exist and clean up orphaned database records
      for (const photo of photos) {
        const fileInfo = await FileSystem.getInfoAsync(photo.file_path);
        if (!fileInfo.exists) {
          const db = await DatabaseService.getDatabase();
          await db.runAsync('DELETE FROM plant_photos WHERE id = ?', [photo.id]);
        }
      }

      // Clean up orphaned files (files that exist but aren't in database)
      const dirInfo = await FileSystem.getInfoAsync(this.PHOTOS_DIR);
      if (dirInfo.exists && dirInfo.isDirectory) {
        const files = await FileSystem.readDirectoryAsync(this.PHOTOS_DIR);
        const dbPhotoPaths = new Set(photos.map(p => p.file_path.split('/').pop()));
        
        for (const fileName of files) {
          if (!dbPhotoPaths.has(fileName)) {
            await FileSystem.deleteAsync(`${this.PHOTOS_DIR}${fileName}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up orphaned photos:', error);
    }
  }

  static async deleteAllPhotos(): Promise<void> {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Get all photos before deleting from database
      const photos = await this.getAllPhotosForDeletion();
      
      // Delete all files
      for (const photo of photos) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(photo.file_path);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(photo.file_path);
          }
        } catch (error) {
          console.error(`Error deleting photo file ${photo.file_path}:`, error);
        }
      }
      
      // Delete all database records
      await db.runAsync('DELETE FROM plant_photos');
      
      // Clean up photos directory if it exists
      const dirInfo = await FileSystem.getInfoAsync(this.PHOTOS_DIR);
      if (dirInfo.exists && dirInfo.isDirectory) {
        try {
          await FileSystem.deleteAsync(this.PHOTOS_DIR);
        } catch (error) {
          console.error('Error deleting photos directory:', error);
        }
      }
    } catch (error) {
      console.error('Error deleting all photos:', error);
      throw error;
    }
  }

  private static async getAllPhotosForDeletion(): Promise<PlantPhoto[]> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getAllAsync('SELECT * FROM plant_photos');
    return result.map(row => ({
      ...row,
      synced: Boolean((row as any).synced)
    })) as PlantPhoto[];
  }
}
