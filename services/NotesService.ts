import { PlantNote } from '../types/Plant';
import { supabase } from './SupabaseService';
import type { Database } from '../types/Database';

type PlantNoteRow = Database['public']['Tables']['plant_notes']['Row'];
type PlantNoteInsert = Database['public']['Tables']['plant_notes']['Insert'];
type PlantNoteUpdate = Database['public']['Tables']['plant_notes']['Update'];

export class NotesService {
  static async getNotesByPlantId(plantId: string): Promise<PlantNote[]> {
    const { data, error } = await supabase
      .from('plant_notes')
      .select('*')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      throw new Error(`Failed to fetch notes: ${error.message}`);
    }

    return (data || []) as PlantNote[];
  }

  static async createNote(plantId: string, content: string): Promise<PlantNote> {
    const noteInsert: PlantNoteInsert = {
      plant_id: plantId,
      content
    };

    const { data, error } = await supabase
      .from('plant_notes')
      .insert(noteInsert)
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      throw new Error(`Failed to create note: ${error.message}`);
    }

    return data as PlantNote;
  }

  static async updateNote(id: string, content: string): Promise<PlantNote | null> {
    const noteUpdate: PlantNoteUpdate = {
      content,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('plant_notes')
      .update(noteUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error updating note:', error);
      throw new Error(`Failed to update note: ${error.message}`);
    }

    return data as PlantNote;
  }

  static async getNoteById(id: string): Promise<PlantNote | null> {
    const { data, error } = await supabase
      .from('plant_notes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error fetching note:', error);
      throw new Error(`Failed to fetch note: ${error.message}`);
    }

    return data as PlantNote;
  }

  static async deleteNote(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('plant_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting note:', error);
      throw new Error(`Failed to delete note: ${error.message}`);
    }

    return true;
  }

  static async searchNotes(query: string): Promise<PlantNote[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const { data, error } = await supabase
      .from('plant_notes')
      .select('*')
      .ilike('content', searchTerm)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching notes:', error);
      throw new Error(`Failed to search notes: ${error.message}`);
    }

    return (data || []) as PlantNote[];
  }

  static async getAllNotes(): Promise<PlantNote[]> {
    const { data, error } = await supabase
      .from('plant_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all notes:', error);
      throw new Error(`Failed to fetch all notes: ${error.message}`);
    }

    return (data || []) as PlantNote[];
  }

  static async deleteAllNotes(): Promise<void> {
    const { error } = await supabase
      .from('plant_notes')
      .delete()
      .neq('id', ''); // Delete all rows

    if (error) {
      console.error('Error deleting all notes:', error);
      throw new Error(`Failed to delete all notes: ${error.message}`);
    }
  }
}