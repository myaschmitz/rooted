import {
  Droplets,
  Calendar,
  Scissors,
  Bug,
  Sprout,
  Leaf,
  Move,
  TreePine,
  MoreHorizontal,
  LucideIcon,
} from "lucide-react-native";

/**
 * SINGLE SOURCE OF TRUTH for the set of event types the app supports.
 *
 * This list must stay in sync with:
 *   - the `events.event_type` CHECK constraint in supabase/migrations
 *   - `Event.event_type` in types/Plant.ts (imports `CareEventType`)
 *   - `Database.public.Tables.events` rows in types/Database.ts
 *     (imports `CareEventType`)
 *
 * Anything that adds a new event type should add it here first.
 */
export const CARE_EVENT_TYPES = [
  "water",
  "fertilize",
  "fertigate",
  "repot",
  "prune",
  "pest_spotted",
  "insecticide_spray",
  "new_leaf",
  "relocation",
  "new_roots_spotted",
  "other",
] as const;

export type CareEventType = (typeof CARE_EVENT_TYPES)[number];

/**
 * `care`  — actions the user performs on a plant (water, prune, …).
 *           Shown in the "Care" tab and available for bulk-apply.
 * `event` — observations / one-off events (new leaf, relocation, …).
 *           Shown in the "Events" tab; not exposed in bulk-apply.
 */
export type CareEventCategory = "care" | "event";

export interface CareTypeDefinition {
  type: CareEventType;
  label: string;
  icon: LucideIcon;
  color: string;
  category: CareEventCategory;
}

export const CARE_TYPES: CareTypeDefinition[] = [
  // ----- Care actions -----
  {
    type: "water",
    label: "Water",
    icon: Droplets,
    color: "#2196F3",
    category: "care",
  },
  {
    type: "fertilize",
    label: "Fertilize",
    icon: Calendar,
    color: "#4CAF50",
    category: "care",
  },
  {
    type: "fertigate",
    label: "Fertigate",
    icon: Droplets,
    color: "#00BCD4",
    category: "care",
  },
  {
    type: "repot",
    label: "Repot",
    icon: Sprout,
    color: "#795548",
    category: "care",
  },
  {
    type: "prune",
    label: "Prune",
    icon: Scissors,
    color: "#FF9800",
    category: "care",
  },
  {
    type: "insecticide_spray",
    label: "Insecticide",
    icon: Sprout,
    color: "#9C27B0",
    category: "care",
  },

  // ----- Observation events -----
  {
    type: "pest_spotted",
    label: "Pest Spotted",
    icon: Bug,
    color: "#F44336",
    category: "event",
  },
  {
    type: "new_leaf",
    label: "New Leaf",
    icon: Leaf,
    color: "#8BC34A",
    category: "event",
  },
  {
    type: "relocation",
    label: "Relocation",
    icon: Move,
    color: "#5D4037",
    category: "event",
  },
  {
    type: "new_roots_spotted",
    label: "New Roots",
    icon: TreePine,
    color: "#33691E",
    category: "event",
  },
  {
    type: "other",
    label: "Other",
    icon: MoreHorizontal,
    color: "#607D8B",
    category: "event",
  },
];

/**
 * Care actions — bulk-applyable. Used by `BatchCareModal` and the
 * "Care" tab on the log-care / edit-care-event screens.
 */
export const CARE_ACTIONS: CareTypeDefinition[] = CARE_TYPES.filter(
  (c) => c.category === "care",
);

/**
 * Observation events. Used by the "Events" tab on the log-care /
 * edit-care-event screens. Not exposed in `BatchCareModal`.
 */
export const OBSERVATION_EVENTS: CareTypeDefinition[] = CARE_TYPES.filter(
  (c) => c.category === "event",
);

export const getCareTypeByType = (
  type: CareEventType,
): CareTypeDefinition | undefined => {
  return CARE_TYPES.find((ct) => ct.type === type);
};

/**
 * Helper to check if an event type involves fertilizer.
 * Centralizes the logic for identifying fertilizer-related events.
 */
export function isFertilizerEvent(eventType: CareEventType | string): boolean {
  return eventType === "fertilize" || eventType === "fertigate";
}

/**
 * Helper to check if an event type involves watering.
 * Centralizes the logic for identifying watering-related events.
 */
export function isWateringEvent(eventType: CareEventType | string): boolean {
  return eventType === "water" || eventType === "fertigate";
}

/**
 * Event types that should be included in watering history.
 */
export const WATERING_EVENT_TYPES: CareEventType[] = [
  "water",
  "fertigate",
] as const;

export type FertilizerStrength = "1/4" | "1/2" | "1x" | "1.5x" | "2x";

export const FERTILIZER_STRENGTHS: FertilizerStrength[] = [
  "1/4",
  "1/2",
  "1x",
  "1.5x",
  "2x",
];

export const PEST_SEVERITY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
