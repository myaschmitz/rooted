import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { PlantPhoto } from '../types/Plant';
import { supabase } from './SupabaseService';
import type { Database } from '../types/Database';

type PlantPhotoRow = Database['public']['Tables']['plant_photos']['Row'];
type PlantPhotoInsert = Database['public']['Tables']['plant_photos']['Insert'];
type PlantPhotoUpdate = Database['public']['Tables']['plant_photos']['Update'];

export class PhotoService {
  private static readonly PHOTOS_DIR = `${FileSystem.documentDirectory}plant_photos/`;
  private static readonly STORAGE_BUCKET = 'plant-photos';

  static async ensurePhotosDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.PHOTOS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.PHOTOS_DIR, { intermediates: true });
    }
  }

  static async getPhotosByPlantId(plantId: string): Promise<PlantPhoto[]> {
    const { data, error } = await supabase
      .from('plant_photos')
      .select('*')
      .eq('plant_id', plantId)
      .order('taken_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos:', error);
      throw new Error(`Failed to fetch photos: ${error.message}`);
    }

    return (data || []) as PlantPhoto[];
  }

  static async getPhotosByPlantIdOldestFirst(plantId: string): Promise<PlantPhoto[]> {
    const { data, error } = await supabase
      .from('plant_photos')
      .select('*')
      .eq('plant_id', plantId)
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

  static async savePhoto(plantId: string, sourceUri: string, caption?: string): Promise<PlantPhoto> {
    try {
      await this.ensurePhotosDirectory();

      // Generate unique filename
      const timestamp = new Date().getTime();
      const fileName = `${plantId}_${timestamp}.jpg`;
      const localFilePath = `${this.PHOTOS_DIR}${fileName}`;

      // Copy file to local storage for offline access
      await FileSystem.copyAsync({
        from: sourceUri,
        to: localFilePath,
      });

      // Upload to Supabase Storage for cloud backup and sync
      let cloudFilePath: string | null = null;
      try {
        console.log('Starting cloud upload for file:', fileName);
        const fileInfo = await FileSystem.getInfoAsync(localFilePath);
        if (fileInfo.exists) {
          console.log('Local file exists, size:', fileInfo.size);
          
          // Read file as base64
          const fileContent = await FileSystem.readAsStringAsync(localFilePath, {
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
              cloudFilePath = urlData.publicUrl;
              console.log('Public URL obtained:', cloudFilePath);
            } else {
              console.error('Failed to get public URL for uploaded file');
            }
          } else {
            console.error('Upload succeeded but no data returned');
          }
        } else {
          console.error('Local file does not exist:', localFilePath);
        }
      } catch (storageError) {
        console.error('Failed to upload to cloud storage:', storageError);
        console.error('Storage error details:', JSON.stringify(storageError, null, 2));
        // Don't fallback to local path - only store cloud URLs in database
      }

      // Only proceed if we have a cloud URL
      if (!cloudFilePath) {
        // Clean up the local file since we couldn't upload to cloud
        try {
          await FileSystem.deleteAsync(localFilePath);
        } catch (cleanupError) {
          console.warn('Failed to clean up local file after cloud upload failure:', cleanupError);
        }
        throw new Error('Failed to upload photo to cloud storage. Please check your internet connection and try again.');
      }

      const now = new Date().toISOString();
      const photoInsert: PlantPhotoInsert = {
        plant_id: plantId,
        file_path: cloudFilePath, // Use cloud path if available, otherwise local
        caption: caption || undefined,
        taken_at: now,
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

      return data as PlantPhoto;
    } catch (error) {
      console.error('Error saving photo:', error);
      throw error;
    }
  }

  static async updatePhotoCaption(photoId: string, caption: string): Promise<PlantPhoto | null> {
    const photoUpdate: PlantPhotoUpdate = {
      caption,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('plant_photos')
      .update(photoUpdate)
      .eq('id', photoId)
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
    const { data, error } = await supabase
      .from('plant_photos')
      .select('*')
      .eq('id', id)
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

      // Delete from Supabase Storage if it's a cloud URL
      if (photo.file_path.startsWith('http')) {
        try {
          const fileName = photo.file_path.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from(this.STORAGE_BUCKET)
              .remove([fileName]);
          }
        } catch (storageError) {
          console.warn('Failed to delete from cloud storage:', storageError);
        }
      } else {
        // Delete local file
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
    const { data, error } = await supabase
      .from('plant_photos')
      .select('*')
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
      const { error } = await supabase
        .from('plants')
        .update({ 
          thumbnail_photo_id: photoId,
          updated_at: new Date().toISOString()
        })
        .eq('id', plantId);

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
      const { error } = await supabase
        .from('plants')
        .update({ 
          thumbnail_photo_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', plantId);

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
      // Get plant's thumbnail_photo_id and then fetch the photo
      const { data: plantData, error: plantError } = await supabase
        .from('plants')
        .select('thumbnail_photo_id')
        .eq('id', plantId)
        .single();

      if (plantError) {
        if (plantError.code === 'PGRST116') {
          return null; // Plant not found
        }
        console.error('Error fetching plant for thumbnail:', plantError);
        throw new Error(`Failed to fetch plant for thumbnail: ${plantError.message}`);
      }

      if (!plantData?.thumbnail_photo_id) {
        return null; // No thumbnail set
      }

      // Fetch the actual photo
      return await this.getPhotoById(plantData.thumbnail_photo_id);
    } catch (error) {
      console.error('Error getting thumbnail photo:', error);
      return null;
    }
  }
}