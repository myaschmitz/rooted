import {
  DatabaseError,
  StorageError,
  PlantNotFoundError,
  EventNotFoundError,
  TagNotFoundError,
  PhotoNotFoundError,
  NoteNotFoundError,
  HouseholdNotFoundError,
  DuplicateError,
  PermissionError,
} from './AppErrors';
import { DB_ERROR_CODES } from '../constants/domain';

/**
 * Error Mapper
 * 
 * Maps database-specific errors to domain errors.
 * This hides database implementation details from the rest of the application.
 * 
 * If we switch from Supabase to another database, only this file needs to change.
 */
export class ErrorMapper {
  /**
   * Map Supabase error to appropriate domain error.
   */
  static mapDatabaseError(error: any, operation: string, entityType?: 'plant' | 'event' | 'tag' | 'photo' | 'note' | 'household'): Error {
    // Check for "not found" errors
    if (error?.code === DB_ERROR_CODES.NOT_FOUND) {
      switch (entityType) {
        case 'plant':
          return new PlantNotFoundError();
        case 'event':
          return new EventNotFoundError();
        case 'tag':
          return new TagNotFoundError();
        case 'photo':
          return new PhotoNotFoundError();
        case 'note':
          return new NoteNotFoundError();
        case 'household':
          return new HouseholdNotFoundError();
        default:
          return new DatabaseError(operation, 'Record not found');
      }
    }

    // Check for duplicate/unique constraint violations
    if (error?.code === DB_ERROR_CODES.DUPLICATE) {
      return new DuplicateError(entityType || 'Record');
    }

    // Check for permission errors (PostgreSQL code 42501)
    if (error?.code === '42501') {
      return new PermissionError(operation);
    }

    // PostgreSQL constraint violations (23xxx codes)
    if (error?.code?.startsWith('23')) {
      return new DatabaseError(operation, 'Constraint violation');
    }

    // Generic database error
    return new DatabaseError(operation, error?.message || 'Unknown error');
  }

  /**
   * Map storage (file upload/download) error to domain error.
   */
  static mapStorageError(error: any, operation: string): Error {
    // Storage-specific error codes can be mapped here
    if (error?.statusCode === 404) {
      return new StorageError(operation, 'File not found');
    }

    if (error?.statusCode === 403) {
      return new PermissionError(operation);
    }

    if (error?.statusCode === 413) {
      return new StorageError(operation, 'File too large');
    }

    return new StorageError(operation, error?.message || 'Unknown storage error');
  }
}
