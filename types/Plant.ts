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

export interface Event {
  id: string;
  plant_id: string;
  event_type: 'water' | 'fertilize' | 'fertigate' | 'repot' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'new_leaf' | 'relocation' | 'new_roots_spotted' | 'other';
  date: string;
  notes?: string;
  fertilizer_concentration?: '1/4' | '1/2' | '1x' | '1.5x' | '2x';
  pest_severity?: number; // 1-10 scale for pest events
  household_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PlantPhoto {
  id: string;
  plant_id: string;
  file_path: string;
  thumbnail_path?: string;
  caption?: string;
  taken_at: string;
  event_id?: string;
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
