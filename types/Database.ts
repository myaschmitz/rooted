export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          updated_at?: string;
        };
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id?: string;
          user_name: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id?: string;
          user_name: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          user_name?: string;
          role?: 'admin' | 'member';
        };
      };
      activity_log: {
        Row: {
          id: string;
          household_id: string;
          user_name: string;
          action: string;
          plant_name?: string;
          details?: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_name: string;
          action: string;
          plant_name?: string;
          details?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_name?: string;
          action?: string;
          plant_name?: string;
          details?: any;
        };
      };
      plants: {
        Row: {
          id: string;
          name?: string;
          type: string;
          location?: string;
          notes?: string;
          thumbnail_photo_id?: string;
          household_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          type: string;
          location?: string;
          notes?: string;
          thumbnail_photo_id?: string;
          household_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          location?: string;
          notes?: string;
          thumbnail_photo_id?: string;
          household_id?: string;
          updated_at?: string;
        };
      };
      care_events: {
        Row: {
          id: string;
          plant_id: string;
          event_type: 'water' | 'fertilize' | 'fertigate' | 'repot' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other';
          date: string;
          notes?: string;
          fertilizer_concentration?: string;
          fertilizer_amount?: string;
          pest_severity?: number;
          household_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plant_id: string;
          event_type: 'water' | 'fertilize' | 'fertigate' | 'repot' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other';
          date: string;
          notes?: string;
          fertilizer_concentration?: string;
          fertilizer_amount?: string;
          pest_severity?: number;
          household_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plant_id?: string;
          event_type?: 'water' | 'fertilize' | 'fertigate' | 'repot' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other';
          date?: string;
          notes?: string;
          fertilizer_concentration?: string;
          fertilizer_amount?: string;
          pest_severity?: number;
          household_id?: string;
          updated_at?: string;
        };
      };
      plant_photos: {
        Row: {
          id: string;
          plant_id: string;
          file_path: string;
          thumbnail_path?: string;
          caption?: string;
          taken_at: string;
          household_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plant_id: string;
          file_path: string;
          thumbnail_path?: string;
          caption?: string;
          taken_at: string;
          household_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plant_id?: string;
          file_path?: string;
          thumbnail_path?: string;
          caption?: string;
          taken_at?: string;
          household_id?: string;
          updated_at?: string;
        };
      };
      plant_notes: {
        Row: {
          id: string;
          plant_id: string;
          content: string;
          household_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plant_id: string;
          content: string;
          household_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plant_id?: string;
          content?: string;
          household_id?: string;
          updated_at?: string;
        };
      };
    };
  };
};