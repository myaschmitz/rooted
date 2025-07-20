export type Database = {
  public: {
    Tables: {
      plants: {
        Row: {
          id: string;
          name?: string;
          type: string;
          location?: string;
          health_status?: 'excellent' | 'good' | 'okay' | 'poor' | 'concerning' | 'critical';
          notes?: string;
          thumbnail_photo_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          type: string;
          location?: string;
          health_status?: 'excellent' | 'good' | 'okay' | 'poor' | 'concerning' | 'critical';
          notes?: string;
          thumbnail_photo_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          location?: string;
          health_status?: 'excellent' | 'good' | 'okay' | 'poor' | 'concerning' | 'critical';
          notes?: string;
          thumbnail_photo_id?: string;
          updated_at?: string;
        };
      };
      care_events: {
        Row: {
          id: string;
          plant_id: string;
          event_type: 'water' | 'fertilize' | 'repot' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other';
          date: string;
          notes?: string;
          fertilizer_concentration?: string;
          fertilizer_amount?: string;
          pest_severity?: number;
          health_status?: 'excellent' | 'good' | 'okay' | 'poor' | 'concerning' | 'critical';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plant_id: string;
          event_type: 'water' | 'fertilize' | 'repot' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other';
          date: string;
          notes?: string;
          fertilizer_concentration?: string;
          fertilizer_amount?: string;
          pest_severity?: number;
          health_status?: 'excellent' | 'good' | 'okay' | 'poor' | 'concerning' | 'critical';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plant_id?: string;
          event_type?: 'water' | 'fertilize' | 'repot' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other';
          date?: string;
          notes?: string;
          fertilizer_concentration?: string;
          fertilizer_amount?: string;
          pest_severity?: number;
          health_status?: 'excellent' | 'good' | 'okay' | 'poor' | 'concerning' | 'critical';
          updated_at?: string;
        };
      };
      plant_photos: {
        Row: {
          id: string;
          plant_id: string;
          file_path: string;
          caption?: string;
          taken_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plant_id: string;
          file_path: string;
          caption?: string;
          taken_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plant_id?: string;
          file_path?: string;
          caption?: string;
          taken_at?: string;
          updated_at?: string;
        };
      };
      plant_notes: {
        Row: {
          id: string;
          plant_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plant_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plant_id?: string;
          content?: string;
          updated_at?: string;
        };
      };
    };
  };
};