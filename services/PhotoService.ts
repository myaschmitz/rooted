import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { PlantPhoto } from '../types/Plant';
import { supabase } from './SupabaseService';
import { HouseholdService } from './HouseholdService';
import { PlantService } from './PlantService';
import type { Database } from '../types/Database';

type PlantPhotoRow = Database['public']['Tables']['plant_photos']['Row'];
type PlantPhotoInsert = Database['public']['Tables']['plant_photos']['Insert'];
type PlantPhotoUpdate = Database['public']['Tables']['plant_photos']['Update'];

export class PhotoService {
  private static readonly PHOTOS_DIR = `${FileSystem.documentDirectory}plant_photos/`;
  private static readonly STORAGE_BUCKET = 'plant-photos';
  private static readonly THUMBNAIL_SIZE = 300;

  static async ensurePhotosDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.PHOTOS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.PHOTOS_DIR, { intermediates: true });
    }
  }

  static async createThumbnail(sourceUri: string): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        sourceUri,
        [{ resize: { width: this.THUMBNAIL_SIZE } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return result.uri;
    } catch (error) {
      console.error('Error creating thumbnail:', error);
      throw new Error('Failed to create thumbnail');
    }
  }

  static getImageUrl(photo: PlantPhoto, useThumbnail: boolean = false): string {
    // Return thumbnail if requested and available, otherwise fall back to full-size
    if (useThumbnail && photo.thumbnail_path) {
      return photo.thumbnail_path;
    }
    return photo.file_path;
  }

  static async uploadFileToStorage(filePath: string, fileName: string): Promise<string | null> {
    try {
      console.log('Starting cloud upload for file:', fileName);
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        console.error('Local file does not exist:', filePath);
        return null;
      }

      console.log('Local file exists, size:', fileInfo.size);
      
      // Read file as base64
      const fileContent = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('File read as base64, length:', fileContent.length);
      
      // Convert base64 to Uint8Array for React Native
      const binaryString = atob(fileContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      console.log('Converted to Uint8Array, size:', bytes.length);

      // Upload to Supabase Storage
      console.log('Uploading to bucket:', this.STORAGE_BUCKET);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        throw uploadError;
      }

      if (uploadData) {
        console.log('Upload successful:', uploadData);
        // Get public URL
        const { data: urlData } = supabase.storage
          .from(this.STORAGE_BUCKET)
          .getPublicUrl(fileName);
        
        if (urlData?.publicUrl) {
          console.log('Public URL obtained:', urlData.publicUrl);
          return urlData.publicUrl;
        } else {
          console.error('Failed to get public URL for uploaded file');
          return null;
        }
      } else {
        console.error('Upload succeeded but no data returned');
        return null;
      }
    } catch (error) {
      console.error('Failed to upload to cloud storage:', error);
      return null;
    }
  }

  static async getPhotosByPlantId(plantId: string): Promise<PlantPhoto[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    // Verify plant belongs to current household
    const plant = await PlantService.getPlantById(plantId);
    if (!plant) {
      throw new Error('Plant not found or not accessible');
    }

    const { data, error } = await supabase
      .from('plant_photos')
      .select('*')
      .eq('plant_id', plantId)
      .eq('household_id', session.household_id)
      .order('taken_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos:', error);
      throw new Error(`Failed to fetch photos: ${error.message}`);
    }

    return (data || []) as PlantPhoto[];
  }

  static async getPhotosByPlantIdOldestFirst(plantId: string): Promise<PlantPhoto[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    // Verify plant belongs to current household
    const plant = await PlantService.getPlantById(plantId);
    if (!plant) {
      throw new Error('Plant not found or not accessible');
    }

    const { data, error } = await supabase
      .from('plant_photos')
      .select('*')
      .eq('plant_id', plantId)
      .eq('household_id', session.household_id)
      .order('taken_at', { ascending: true });

    if (error) {
      console.error('Error fetching photos:', error);
      throw new Error(`Failed to fetch photos: ${error.message}`);
    }

    return (data || []) as PlantPhoto[];
  }

  static async pickAndSavePhoto(plantId: string, caption?: string): Promise<PlantPhoto | null> {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access camera roll is required!');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
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
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access camera is required!');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        cameraType: ImagePicker.CameraType.back,
        allowsMultipleSelection: false,
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
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access camera is required!');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        cameraType: ImagePicker.CameraType.back,
        allowsMultipleSelection: false,
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
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access camera roll is required!');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
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

  static async pickMultiplePhotos(): Promise<{ uri: string }[] | null> {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access camera roll is required!');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (result.canceled) {
        return null;
      }

      return result.assets.map(asset => ({ uri: asset.uri }));
    } catch (error) {
      console.error('Error picking multiple photos:', error);
      throw error;
    }
  }

  static async saveEventPhoto(plantId: string, eventId: string, sourceUri: string, caption?: string): Promise<PlantPhoto> {
    try {
      await this.ensurePhotosDirectory();

      // Generate unique filenames
      const timestamp = new Date().getTime();
      const fullSizeFileName = `${plantId}_event_${eventId}_${timestamp}.jpg`;
      const thumbnailFileName = `${plantId}_event_${eventId}_${timestamp}_thumb.jpg`;
      const localFullSizePath = `${this.PHOTOS_DIR}${fullSizeFileName}`;

      // Copy full-size file to local storage for offline access
      await FileSystem.copyAsync({
        from: sourceUri,
        to: localFullSizePath,
      });

      // Create thumbnail
      console.log('Creating thumbnail...');
      const thumbnailUri = await this.createThumbnail(sourceUri);
      const localThumbnailPath = `${this.PHOTOS_DIR}${thumbnailFileName}`;
      
      // Copy thumbnail to local storage
      await FileSystem.copyAsync({
        from: thumbnailUri,
        to: localThumbnailPath,
      });

      // Upload both versions to Supabase Storage in parallel
      console.log('Uploading full-size and thumbnail to cloud storage...');
      const [cloudFullSizePath, cloudThumbnailPath] = await Promise.all([
        this.uploadFileToStorage(localFullSizePath, fullSizeFileName),
        this.uploadFileToStorage(localThumbnailPath, thumbnailFileName),
      ]);

      // Clean up local files after processing
      try {
        await FileSystem.deleteAsync(localFullSizePath);
        await FileSystem.deleteAsync(localThumbnailPath);
        await FileSystem.deleteAsync(thumbnailUri);
      } catch (cleanupError) {
        console.warn('Failed to clean up local files:', cleanupError);
      }

      if (!cloudFullSizePath) {
        throw new Error('Failed to upload full-size photo to cloud storage. Please check your internet connection and try again.');
      }

      if (!cloudThumbnailPath) {
        console.warn('Failed to upload thumbnail to cloud storage, but proceeding with full-size image only.');
      }

      // Get current household session and verify access
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error('No household session found');
      }

      const plant = await PlantService.getPlantById(plantId);
      if (!plant) {
        throw new Error('Plant not found or not accessible');
      }

      const now = new Date().toISOString();
      const photoInsert: PlantPhotoInsert = {
        plant_id: plantId,
        event_id: eventId,
        file_path: cloudFullSizePath,
        thumbnail_path: cloudThumbnailPath || undefined,
        caption: caption || undefined,
        taken_at: now,
        household_id: session.household_id,
      };

      const { data, error } = await supabase
        .from('plant_photos')
        .insert(photoInsert)
        .select()
        .single();

      if (error) {
        console.error('Error saving event photo to database:', error);
        throw new Error(`Failed to save photo: ${error.message}`);
      }

      console.log('Event photo saved successfully');
      return data as PlantPhoto;
    } catch (error) {
      console.error('Error saving event photo:', error);
      throw error;
    }
  }

  static async saveMultipleEventPhotos(plantId: string, eventId: string, sourceUris: string[], caption?: string): Promise<PlantPhoto[]> {
    const savedPhotos: PlantPhoto[] = [];
    
    for (const sourceUri of sourceUris) {
      try {
        const photo = await this.saveEventPhoto(plantId, eventId, sourceUri, caption);
        savedPhotos.push(photo);
      } catch (error) {
        console.error(`Failed to save photo ${sourceUri}:`, error);
        // Continue with other photos even if one fails
      }
    }
    
    return savedPhotos;
  }

  static async getPhotosByEventId(eventId: string): Promise<PlantPhoto[]> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const { data, error } = await supabase
      .from('plant_photos')
      .select('*')
      .eq('event_id', eventId)
      .eq('household_id', session.household_id)
      .order('taken_at', { ascending: false });

    if (error) {
      console.error('Error fetching event photos:', error);
      throw new Error(`Failed to fetch event photos: ${error.message}`);
    }

    return (data || []) as PlantPhoto[];
  }

  static async linkPhotoToEvent(photoId: string, eventId: string): Promise<PlantPhoto | null> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const photoUpdate: PlantPhotoUpdate = {
      event_id: eventId,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('plant_photos')
      .update(photoUpdate)
      .eq('id', photoId)
      .eq('household_id', session.household_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error linking photo to event:', error);
      throw new Error(`Failed to link photo to event: ${error.message}`);
    }

    return data as PlantPhoto;
  }

  static async unlinkPhotoFromEvent(photoId: string): Promise<PlantPhoto | null> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const photoUpdate: PlantPhotoUpdate = {
      event_id: null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('plant_photos')
      .update(photoUpdate)
      .eq('id', photoId)
      .eq('household_id', session.household_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error unlinking photo from event:', error);
      throw new Error(`Failed to unlink photo from event: ${error.message}`);
    }

    return data as PlantPhoto;
  }

  static async savePhoto(plantId: string, sourceUri: string, caption?: string): Promise<PlantPhoto> {
    try {
      await this.ensurePhotosDirectory();

      // Generate unique filenames
      const timestamp = new Date().getTime();
      const fullSizeFileName = `${plantId}_${timestamp}.jpg`;
      const thumbnailFileName = `${plantId}_${timestamp}_thumb.jpg`;
      const localFullSizePath = `${this.PHOTOS_DIR}${fullSizeFileName}`;

      // Copy full-size file to local storage for offline access
      await FileSystem.copyAsync({
        from: sourceUri,
        to: localFullSizePath,
      });

      // Create thumbnail
      console.log('Creating thumbnail...');
      const thumbnailUri = await this.createThumbnail(sourceUri);
      const localThumbnailPath = `${this.PHOTOS_DIR}${thumbnailFileName}`;
      
      // Copy thumbnail to local storage
      await FileSystem.copyAsync({
        from: thumbnailUri,
        to: localThumbnailPath,
      });

      // Upload both versions to Supabase Storage in parallel
      console.log('Uploading full-size and thumbnail to cloud storage...');
      const [cloudFullSizePath, cloudThumbnailPath] = await Promise.all([
        this.uploadFileToStorage(localFullSizePath, fullSizeFileName),
        this.uploadFileToStorage(localThumbnailPath, thumbnailFileName),
      ]);

      // Clean up local files after processing
      try {
        await FileSystem.deleteAsync(localFullSizePath);
        await FileSystem.deleteAsync(localThumbnailPath);
        // Clean up the temporary thumbnail from ImageManipulator
        await FileSystem.deleteAsync(thumbnailUri);
      } catch (cleanupError) {
        console.warn('Failed to clean up local files:', cleanupError);
      }

      // Only proceed if we have both cloud URLs
      if (!cloudFullSizePath) {
        throw new Error('Failed to upload full-size photo to cloud storage. Please check your internet connection and try again.');
      }

      if (!cloudThumbnailPath) {
        console.warn('Failed to upload thumbnail to cloud storage, but proceeding with full-size image only.');
      }

      // Get current household session and verify plant access
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error('No household session found');
      }

      // Verify plant belongs to current household
      const plant = await PlantService.getPlantById(plantId);
      if (!plant) {
        throw new Error('Plant not found or not accessible');
      }

      const now = new Date().toISOString();
      const photoInsert: PlantPhotoInsert = {
        plant_id: plantId,
        file_path: cloudFullSizePath,
        thumbnail_path: cloudThumbnailPath || undefined,
        caption: caption || undefined,
        taken_at: now,
        household_id: session.household_id,
      };

      // Save to Supabase database
      const { data, error } = await supabase
        .from('plant_photos')
        .insert(photoInsert)
        .select()
        .single();

      if (error) {
        console.error('Error saving photo to database:', error);
        throw new Error(`Failed to save photo: ${error.message}`);
      }

      // Check if this plant has no thumbnail yet, and if so, set this as the thumbnail
      const { data: plantData, error: plantError } = await supabase
        .from('plants')
        .select('thumbnail_photo_id')
        .eq('id', plantId)
        .single();
      
      if (!plantError && plantData && !plantData.thumbnail_photo_id && data) {
        await supabase
          .from('plants')
          .update({ 
            thumbnail_photo_id: data.id,
            updated_at: now 
          })
          .eq('id', plantId);
      }

      console.log('Photo saved successfully with full-size and thumbnail versions');
      
      return data as PlantPhoto;
    } catch (error) {
      console.error('Error saving photo:', error);
      throw error;
    }
  }

  static async updatePhotoCaption(photoId: string, caption: string): Promise<PlantPhoto | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const photoUpdate: PlantPhotoUpdate = {
      caption,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('plant_photos')
      .update(photoUpdate)
      .eq('id', photoId)
      .eq('household_id', session.household_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error updating photo caption:', error);
      throw new Error(`Failed to update photo caption: ${error.message}`);
    }

    return data as PlantPhoto;
  }

  static async getPhotoById(id: string): Promise<PlantPhoto | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const { data, error } = await supabase
      .from('plant_photos')
      .select('*')
      .eq('id', id)
      .eq('household_id', session.household_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error fetching photo:', error);
      throw new Error(`Failed to fetch photo: ${error.message}`);
    }

    return data as PlantPhoto;
  }

  static async deletePhoto(photoId: string): Promise<boolean> {
    try {
      const photo = await this.getPhotoById(photoId);
      if (!photo) return false;

      // Delete both full-size and thumbnail from Supabase Storage
      const filesToDelete: string[] = [];
      
      // Add full-size file to deletion list
      if (photo.file_path.startsWith('http')) {
        const fileName = photo.file_path.split('/').pop();
        if (fileName) {
          filesToDelete.push(fileName);
        }
      }
      
      // Add thumbnail file to deletion list
      if (photo.thumbnail_path && photo.thumbnail_path.startsWith('http')) {
        const thumbnailFileName = photo.thumbnail_path.split('/').pop();
        if (thumbnailFileName) {
          filesToDelete.push(thumbnailFileName);
        }
      }
      
      // Delete files from cloud storage
      if (filesToDelete.length > 0) {
        try {
          await supabase.storage
            .from(this.STORAGE_BUCKET)
            .remove(filesToDelete);
          console.log(`Deleted ${filesToDelete.length} files from cloud storage:`, filesToDelete);
        } catch (storageError) {
          console.warn('Failed to delete files from cloud storage:', storageError);
        }
      }
      
      // Handle local file deletion (legacy support)
      if (!photo.file_path.startsWith('http')) {
        const fileInfo = await FileSystem.getInfoAsync(photo.file_path);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(photo.file_path);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('plant_photos')
        .delete()
        .eq('id', photoId);

      if (error) {
        console.error('Error deleting photo from database:', error);
        throw new Error(`Failed to delete photo: ${error.message}`);
      }


      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }

  static async getAllPhotos(): Promise<PlantPhoto[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const { data, error } = await supabase
      .from('plant_photos')
      .select('*')
      .eq('household_id', session.household_id)
      .order('taken_at', { ascending: false });

    if (error) {
      console.error('Error fetching all photos:', error);
      throw new Error(`Failed to fetch all photos: ${error.message}`);
    }

    return (data || []) as PlantPhoto[];
  }

  static async cleanupOrphanedPhotos(): Promise<void> {
    try {
      // Get all photos from database
      const photos = await this.getAllPhotos();
      
      // Check local files and clean up orphaned database records
      for (const photo of photos) {
        if (!photo.file_path.startsWith('http')) {
          const fileInfo = await FileSystem.getInfoAsync(photo.file_path);
          if (!fileInfo.exists) {
            await supabase
              .from('plant_photos')
              .delete()
              .eq('id', photo.id);
          }
        }
      }

      // Clean up orphaned local files
      const dirInfo = await FileSystem.getInfoAsync(this.PHOTOS_DIR);
      if (dirInfo.exists && dirInfo.isDirectory) {
        const files = await FileSystem.readDirectoryAsync(this.PHOTOS_DIR);
        const dbPhotoPaths = new Set(
          photos
            .filter(p => !p.file_path.startsWith('http'))
            .map(p => p.file_path.split('/').pop())
        );
        
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
      // Get all photos before deleting from database
      const photos = await this.getAllPhotos();
      
      // Delete all files (both local and cloud)
      for (const photo of photos) {
        try {
          if (photo.file_path.startsWith('http')) {
            // Delete from cloud storage
            const fileName = photo.file_path.split('/').pop();
            if (fileName) {
              await supabase.storage
                .from(this.STORAGE_BUCKET)
                .remove([fileName]);
            }
          } else {
            // Delete local file
            const fileInfo = await FileSystem.getInfoAsync(photo.file_path);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(photo.file_path);
            }
          }
        } catch (error) {
          console.error(`Error deleting photo file ${photo.file_path}:`, error);
        }
      }
      
      // Delete all database records
      const { error } = await supabase
        .from('plant_photos')
        .delete()
        .neq('id', ''); // Delete all rows

      if (error) {
        console.error('Error deleting all photos from database:', error);
        throw new Error(`Failed to delete all photos: ${error.message}`);
      }
      
      // Clean up local photos directory
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

  static async setThumbnailPhoto(plantId: string, photoId: string): Promise<void> {
    try {
      // Get current household session
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error('No household session found');
      }

      // Verify plant belongs to current household
      const plant = await PlantService.getPlantById(plantId);
      if (!plant) {
        throw new Error('Plant not found or not accessible');
      }

      // Verify photo belongs to current household
      const photo = await this.getPhotoById(photoId);
      if (!photo) {
        throw new Error('Photo not found or not accessible');
      }

      const { error } = await supabase
        .from('plants')
        .update({ 
          thumbnail_photo_id: photoId,
          updated_at: new Date().toISOString()
        })
        .eq('id', plantId)
        .eq('household_id', session.household_id);

      if (error) {
        console.error('Error setting thumbnail photo:', error);
        throw new Error(`Failed to set thumbnail photo: ${error.message}`);
      }

    } catch (error) {
      console.error('Error setting thumbnail photo:', error);
      throw error;
    }
  }

  static async clearThumbnailPhoto(plantId: string): Promise<void> {
    try {
      // Get current household session
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error('No household session found');
      }

      // Verify plant belongs to current household
      const plant = await PlantService.getPlantById(plantId);
      if (!plant) {
        throw new Error('Plant not found or not accessible');
      }

      const { error } = await supabase
        .from('plants')
        .update({ 
          thumbnail_photo_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', plantId)
        .eq('household_id', session.household_id);

      if (error) {
        console.error('Error clearing thumbnail photo:', error);
        throw new Error(`Failed to clear thumbnail photo: ${error.message}`);
      }
    } catch (error) {
      console.error('Error clearing thumbnail photo:', error);
      throw error;
    }
  }

  static async testStorageConnection(): Promise<{ success: boolean; error?: string; bucketExists?: boolean }> {
    try {
      console.log('Testing Supabase storage connection...');
      console.log('Testing bucket:', this.STORAGE_BUCKET);
      
      // Try to list files in the bucket to test permissions
      const { data, error } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .list('', {
          limit: 1
        });

      if (error) {
        console.error('Storage bucket access test failed:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Check if bucket exists
        if (error.message?.includes('bucket') && error.message?.includes('not found')) {
          return { success: false, error: 'Bucket does not exist', bucketExists: false };
        }
        
        return { success: false, error: error.message || 'Unknown storage error' };
      }

      console.log('Storage bucket access test successful:', data);
      return { success: true, bucketExists: true };
    } catch (error) {
      console.error('Storage connection test error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async createStorageBucket(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Creating storage bucket:', this.STORAGE_BUCKET);
      
      const { data, error } = await supabase.storage.createBucket(this.STORAGE_BUCKET, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        fileSizeLimit: 10485760 // 10MB
      });

      if (error) {
        console.error('Failed to create storage bucket:', error);
        return { success: false, error: error.message };
      }

      console.log('Storage bucket created successfully:', data);
      return { success: true };
    } catch (error) {
      console.error('Error creating storage bucket:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async getThumbnailPhoto(plantId: string): Promise<PlantPhoto | null> {
    try {
      // Get current household session
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error('No household session found');
      }

      // Verify plant belongs to current household first
      const plant = await PlantService.getPlantById(plantId);
      if (!plant) {
        return null; // Plant not found or not accessible
      }

      if (!plant.thumbnail_photo_id) {
        return null; // No thumbnail set
      }

      // Fetch the actual photo (this will also verify household access)
      return await this.getPhotoById(plant.thumbnail_photo_id);
    } catch (error) {
      console.error('Error getting thumbnail photo:', error);
      return null;
    }
  }

  static async generateThumbnailsForExistingPhotos(): Promise<{ success: number; failed: number; skipped: number }> {
    try {
      console.log('Starting thumbnail generation for existing photos...');
      
      // Get all photos that don't have thumbnails yet
      const { data: photosWithoutThumbnails, error } = await supabase
        .from('plant_photos')
        .select('*')
        .is('thumbnail_path', null);

      if (error) {
        console.error('Error fetching photos without thumbnails:', error);
        throw new Error(`Failed to fetch photos: ${error.message}`);
      }

      if (!photosWithoutThumbnails || photosWithoutThumbnails.length === 0) {
        console.log('No photos found that need thumbnails generated');
        return { success: 0, failed: 0, skipped: 0 };
      }

      console.log(`Found ${photosWithoutThumbnails.length} photos that need thumbnails`);
      
      let success = 0;
      let failed = 0;
      let skipped = 0;

      // Process photos in batches to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < photosWithoutThumbnails.length; i += batchSize) {
        const batch = photosWithoutThumbnails.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (photo) => {
          try {
            console.log(`Processing photo ${photo.id}...`);
            
            // Skip if photo doesn't have a valid cloud URL
            if (!photo.file_path.startsWith('http')) {
              console.log(`Skipping photo ${photo.id} - not a cloud URL`);
              skipped++;
              return;
            }

            // Create thumbnail from the full-size image URL
            const thumbnailUri = await this.createThumbnail(photo.file_path);
            
            // Generate filename for thumbnail
            const originalFileName = photo.file_path.split('/').pop();
            if (!originalFileName) {
              console.error(`Could not extract filename from ${photo.file_path}`);
              failed++;
              return;
            }
            
            // Create thumbnail filename by inserting '_thumb' before the extension
            const thumbnailFileName = originalFileName.replace(/(\.[^.]+)$/, '_thumb$1');
            
            // Copy thumbnail to local storage temporarily
            await this.ensurePhotosDirectory();
            const localThumbnailPath = `${this.PHOTOS_DIR}${thumbnailFileName}`;
            await FileSystem.copyAsync({
              from: thumbnailUri,
              to: localThumbnailPath,
            });

            // Upload thumbnail to cloud storage
            const cloudThumbnailPath = await this.uploadFileToStorage(localThumbnailPath, thumbnailFileName);
            
            // Clean up local files
            try {
              await FileSystem.deleteAsync(localThumbnailPath);
              await FileSystem.deleteAsync(thumbnailUri);
            } catch (cleanupError) {
              console.warn('Failed to clean up temporary files:', cleanupError);
            }

            if (!cloudThumbnailPath) {
              console.error(`Failed to upload thumbnail for photo ${photo.id}`);
              failed++;
              return;
            }

            // Update database with thumbnail path
            const { error: updateError } = await supabase
              .from('plant_photos')
              .update({ thumbnail_path: cloudThumbnailPath })
              .eq('id', photo.id);

            if (updateError) {
              console.error(`Failed to update photo ${photo.id} with thumbnail path:`, updateError);
              failed++;
              return;
            }

            console.log(`Successfully generated thumbnail for photo ${photo.id}`);
            success++;
            
          } catch (error) {
            console.error(`Failed to generate thumbnail for photo ${photo.id}:`, error);
            failed++;
          }
        }));

        // Small delay between batches to be nice to the server
        if (i + batchSize < photosWithoutThumbnails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Thumbnail generation complete: ${success} success, ${failed} failed, ${skipped} skipped`);
      return { success, failed, skipped };
      
    } catch (error) {
      console.error('Error in generateThumbnailsForExistingPhotos:', error);
      throw error;
    }
  }

  static async downloadPhotoToDevice(photoUrl: string, filename?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Starting photo download to device...');
      
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        return { 
          success: false, 
          error: 'Permission to access media library is required to download photos!' 
        };
      }

      // Create a temporary filename if not provided
      const tempFilename = filename || `plant_photo_${Date.now()}.jpg`;
      const downloadPath = `${FileSystem.documentDirectory}${tempFilename}`;

      console.log('Downloading photo from:', photoUrl);
      console.log('Temp download path:', downloadPath);

      // Download the photo to temporary storage
      const downloadResult = await FileSystem.downloadAsync(photoUrl, downloadPath);
      
      if (!downloadResult.uri) {
        return { 
          success: false, 
          error: 'Failed to download photo from server' 
        };
      }

      console.log('Photo downloaded to temp location:', downloadResult.uri);

      // Save to device's media library
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      console.log('Photo saved to media library:', asset);

      // Clean up temporary file
      try {
        await FileSystem.deleteAsync(downloadResult.uri);
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary download file:', cleanupError);
      }

      return { success: true };
      
    } catch (error) {
      console.error('Error downloading photo to device:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
}