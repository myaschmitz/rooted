import type { CareEventType } from "../constants/careTypes";
import type { PropagationMethod } from "../constants/propagation";

export interface Plant {
  id: string;
  name?: string;
  type: string;
  location?: string;
  notes?: string;
  thumbnail_photo_id?: string;
  household_id: string;
  pinned: boolean;
  archived: boolean;
  archived_at?: string;
  /** Plant this one was propagated from. Null for plants with no known origin. */
  parent_plant_id?: string | null;
  propagated_at?: string | null;
  propagation_method?: PropagationMethod | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  plant_id: string;
  event_type: CareEventType;
  date: string;
  notes?: string;
  fertilizer_concentration?: "1/4" | "1/2" | "1x" | "1.5x" | "2x";
  pest_severity?: number; // 1-10 scale for pest events
  /** Set on `propagate` events to link the parent's history to the plant it produced. */
  child_plant_id?: string | null;
  household_id: string;
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
  household_id: string;
  created_at: string;
  updated_at: string;
}

export interface PlantNote {
  id: string;
  plant_id: string;
  content: string;
  household_id: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string; // Hex color code (e.g., '#FF5733')
  household_id: string;
  created_at: string;
  updated_at: string;
}

export interface PlantTag {
  id: string;
  plant_id: string;
  tag_id: string;
  created_at: string;
}

// For convenience when working with plant tags with full tag details
export interface PlantTagWithDetails extends PlantTag {
  tag: Tag;
}

/** The subset of plant columns needed to assemble a propagation tree. */
export interface LineagePlant {
  id: string;
  name?: string;
  type: string;
  archived: boolean;
  thumbnail_photo_id?: string;
  parent_plant_id?: string | null;
  propagated_at?: string | null;
  propagation_method?: PropagationMethod | null;
}

/** A node in an assembled propagation tree. */
export interface LineageNode {
  plant: LineagePlant;
  /** Distance from the root of this plant's family. */
  depth: number;
  children: LineageNode[];
}

export interface PlantLineage {
  /** The plant the lineage was requested for. */
  plant: LineagePlant;
  /** Root of the family the requested plant belongs to. */
  root: LineageNode;
  /** Ancestors of the requested plant, root first. Empty when it is the root. */
  ancestors: LineagePlant[];
  parent: LineagePlant | null;
  children: LineagePlant[];
  /** Every plant in the family, including the requested one. */
  size: number;
}
