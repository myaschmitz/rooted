export interface Plant {
  id: string;
  name?: string;
  type: string;
  location?: string;
  health_status?: 'good' | 'okay' | 'concerning';
  notes?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface CareEvent {
  id: string;
  plant_id: string;
  event_type: 'water' | 'fertilize' | 'repot' | 'prune' | 'other';
  date: string;
  notes?: string;
  fertilizer_concentration?: string;
  fertilizer_amount?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface PlantPhoto {
  id: string;
  plant_id: string;
  file_path: string;
  caption?: string;
  taken_at: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface PlantNote {
  id: string;
  plant_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}
