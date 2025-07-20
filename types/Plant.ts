export interface Plant {
  id: string;
  name?: string;
  type: string;
  location?: string;
  health_status?: 'excellent' | 'good' | 'okay' | 'poor' | 'concerning' | 'critical';
  notes?: string;
  thumbnail_photo_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CareEvent {
  id: string;
  plant_id: string;
  event_type: 'water' | 'fertilize' | 'repot' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other';
  date: string;
  notes?: string;
  fertilizer_concentration?: string;
  fertilizer_amount?: string;
  pest_severity?: number; // 1-10 scale for pest events
  health_status?: 'excellent' | 'good' | 'okay' | 'poor' | 'concerning' | 'critical';
  created_at: string;
  updated_at: string;
}

export interface PlantPhoto {
  id: string;
  plant_id: string;
  file_path: string;
  caption?: string;
  taken_at: string;
  created_at: string;
  updated_at: string;
}

export interface PlantNote {
  id: string;
  plant_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}
