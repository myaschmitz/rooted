/**
 * Application-specific error classes.
 *
 * These domain errors hide implementation details from the rest of the app.
 * If we switch databases or storage providers, only the ErrorMapper needs to change.
 */

/**
 * Base error for all domain-specific errors.
 */
export class DomainError extends Error {
  constructor(message: string, name: string) {
    super(message);
    this.name = name;
  }
}

/**
 * Thrown when a plant cannot be found.
 */
export class PlantNotFoundError extends DomainError {
  constructor(plantId?: string) {
    super(
      plantId ? `Plant with ID ${plantId} not found` : "Plant not found",
      "PlantNotFoundError",
    );
  }
}

/**
 * Thrown when an event cannot be found.
 */
export class EventNotFoundError extends DomainError {
  constructor(eventId?: string) {
    super(
      eventId ? `Event with ID ${eventId} not found` : "Event not found",
      "EventNotFoundError",
    );
  }
}

/**
 * Thrown when a tag cannot be found.
 */
export class TagNotFoundError extends DomainError {
  constructor(tagId?: string) {
    super(
      tagId ? `Tag with ID ${tagId} not found` : "Tag not found",
      "TagNotFoundError",
    );
  }
}

/**
 * Thrown when a photo cannot be found.
 */
export class PhotoNotFoundError extends DomainError {
  constructor(photoId?: string) {
    super(
      photoId ? `Photo with ID ${photoId} not found` : "Photo not found",
      "PhotoNotFoundError",
    );
  }
}

/**
 * Thrown when a note cannot be found.
 */
export class NoteNotFoundError extends DomainError {
  constructor(noteId?: string) {
    super(
      noteId ? `Note with ID ${noteId} not found` : "Note not found",
      "NoteNotFoundError",
    );
  }
}

/**
 * Thrown when a household cannot be found.
 */
export class HouseholdNotFoundError extends DomainError {
  constructor(householdId?: string) {
    super(
      householdId
        ? `Household with ID ${householdId} not found`
        : "Household not found",
      "HouseholdNotFoundError",
    );
  }
}

/**
 * Thrown when there's a database operation error.
 */
export class DatabaseError extends DomainError {
  constructor(operation: string, details?: string) {
    super(
      `Database error during ${operation}${details ? `: ${details}` : ""}`,
      "DatabaseError",
    );
  }
}

/**
 * Thrown when there's a storage operation error (file upload/download).
 */
export class StorageError extends DomainError {
  constructor(operation: string, details?: string) {
    super(
      `Storage error during ${operation}${details ? `: ${details}` : ""}`,
      "StorageError",
    );
  }
}

/**
 * Thrown when a duplicate entry is attempted.
 */
export class DuplicateError extends DomainError {
  constructor(entityType: string, identifier?: string) {
    super(
      identifier
        ? `${entityType} with identifier ${identifier} already exists`
        : `${entityType} already exists`,
      "DuplicateError",
    );
  }
}

/**
 * Thrown when user lacks permission for an operation.
 */
export class PermissionError extends DomainError {
  constructor(operation: string) {
    super(`Permission denied for ${operation}`, "PermissionError");
  }
}

/**
 * Thrown when validation fails.
 */
export class ValidationError extends DomainError {
  constructor(field: string, message: string) {
    super(`Validation error for ${field}: ${message}`, "ValidationError");
  }
}
