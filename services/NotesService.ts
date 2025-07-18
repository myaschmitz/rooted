import uuid from 'react-native-uuid';
import { PlantNote } from '../types/Plant';
import { DatabaseService } from './DatabaseService';

export class NotesService {
  static async getNotesByPlantId(plantId: string): Promise<PlantNote[]> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM plant_notes WHERE plant_id = ? ORDER BY created_at DESC',
      [plantId]
    );
    return result.map(row => ({
      ...(row as any),
      synced: Boolean((row as any).synced)
    })) as PlantNote[];
  }

  static async createNote(plantId: string, content: string): Promise<PlantNote> {
    const db = await DatabaseService.getDatabase();
    const now = new Date().toISOString();
    const note: PlantNote = {
      id: uuid.v4() as string,
      plant_id: plantId,
      content,
      created_at: now,
      updated_at: now,
      synced: false
    };

    await db.runAsync(
      `INSERT INTO plant_notes (id, plant_id, content, created_at, updated_at, synced)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [note.id, note.plant_id, note.content, note.created_at, note.updated_at, note.synced ? 1 : 0]
    );

    return note;
  }

  static async updateNote(id: string, content: string): Promise<PlantNote | null> {
    const db = await DatabaseService.getDatabase();
    const now = new Date().toISOString();
    
    const currentNote = await this.getNoteById(id);
    if (!currentNote) return null;

    const updatedNote = {
      ...currentNote,
      content,
      updated_at: now,
      synced: false
    };

    await db.runAsync(
      'UPDATE plant_notes SET content = ?, updated_at = ?, synced = ? WHERE id = ?',
      [content, now, 0, id]
    );

    return updatedNote;
  }

  static async getNoteById(id: string): Promise<PlantNote | null> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getFirstAsync('SELECT * FROM plant_notes WHERE id = ?', [id]);
    if (!result) return null;
    return {
      ...(result as any),
      synced: Boolean((result as any).synced)
    } as PlantNote;
  }

  static async deleteNote(id: string): Promise<boolean> {
    const db = await DatabaseService.getDatabase();
    const result = await db.runAsync('DELETE FROM plant_notes WHERE id = ?', [id]);
    return result.changes > 0;
  }

  static async searchNotes(query: string): Promise<PlantNote[]> {
    const db = await DatabaseService.getDatabase();
    const searchTerm = `%${query.toLowerCase()}%`;
    const result = await db.getAllAsync(
      'SELECT * FROM plant_notes WHERE LOWER(content) LIKE ? ORDER BY created_at DESC',
      [searchTerm]
    );
    return result.map(row => ({
      ...(row as any),
      synced: Boolean((row as any).synced)
    })) as PlantNote[];
  }

  static async getAllNotes(): Promise<PlantNote[]> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getAllAsync('SELECT * FROM plant_notes ORDER BY created_at DESC');
    return result.map(row => ({
      ...(row as any),
      synced: Boolean((row as any).synced)
    })) as PlantNote[];
  }
}
