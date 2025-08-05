export interface Plant {
  id: string;
  name?: string;
  type: string;
  location?: string;
  notes?: string;
  thumbnail_photo_id?: string;
  household_id?: string;
  pinned?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CareEvent {
  id: string;
  plant_id: string;
  event_type: 'water' | 'fertilize' | 'fertigate' | 'repot' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other';
  date: string;
  notes?: string;
  fertilizer_concentration?: string;
  fertilizer_amount?: string;
  pest_severity?: number; // 1-10 scale for pest events
  household_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PlantPhoto {
  id: string;
  plant_id: string;
  file_path: string;
  caption?: string;
  taken_at: string;
  household_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PlantNote {
  id: string;
  plant_id: string;
  content: string;
  household_id?: string;
  created_at: string;
  updated_at: string;
}
