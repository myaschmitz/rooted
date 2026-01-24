import {
  Droplets,
  Calendar,
  Scissors,
  Bug,
  Sprout,
  MoreHorizontal,
} from "lucide-react-native";
import { LucideIcon } from "lucide-react-native";

export type CareEventType =
  | "water"
  | "fertilize"
  | "fertigate"
  | "prune"
  | "pest_spotted"
  | "insecticide_spray"
  | "repot"
  | "other";

export interface CareTypeDefinition {
  type: CareEventType;
  label: string;
  icon: LucideIcon;
  color: string;
}

export const CARE_TYPES: CareTypeDefinition[] = [
  { type: "water", label: "Watered", icon: Droplets, color: "#2196F3" },
  { type: "fertilize", label: "Fertilized", icon: Calendar, color: "#4CAF50" },
  { type: "fertigate", label: "Fertigated", icon: Droplets, color: "#00BCD4" },
  { type: "prune", label: "Pruned", icon: Scissors, color: "#FF9800" },
  { type: "pest_spotted", label: "Pest Spotted", icon: Bug, color: "#F44336" },
  {
    type: "insecticide_spray",
    label: "Insecticide",
    icon: Sprout,
    color: "#9C27B0",
  },
  { type: "repot", label: "Repotted", icon: Sprout, color: "#795548" },
  { type: "other", label: "Other", icon: MoreHorizontal, color: "#607D8B" },
];

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
