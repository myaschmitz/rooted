import dayjs from 'dayjs';
import { DateTimeService } from '../services/DateTimeService';

/**
 * Formats the time since last watering into a human-readable string
 */
export const formatTimeSinceWatering = (lastWateredDate?: string | null): { timeAgo: string; date: string | null } => {
  if (!lastWateredDate) {
    return { timeAgo: 'Never watered', date: null };
  }

  const wateredDate = dayjs(lastWateredDate);
  const timeAgo = DateTimeService.formatTimeAgo(lastWateredDate);
  const formattedDate = wateredDate.format('MMM D, YYYY');

  return { timeAgo, date: formattedDate };
};

/**
 * Returns a color based on how long ago the plant was watered
 * - Green: Recently watered (within 7 days)
 * - Yellow: Should water soon (8-14 days)
 * - Orange: Getting concerning (15-17 days)
 * - Red: Urgent watering needed (18+ days)
 */
export const getWateringStatusColor = (
  lastWateredDate: string | null | undefined,
  defaultColor: string
): string => {
  if (!lastWateredDate) {
    return defaultColor;
  }

  const now = dayjs();
  const wateredDate = dayjs(lastWateredDate);
  const daysSince = now.diff(wateredDate, 'day');

  if (daysSince <= 7) {
    return '#4CAF50'; // Green - recently watered
  } else if (daysSince <= 14) {
    return '#FFC107'; // Yellow - should water soon
  } else if (daysSince <= 17) {
    return '#FF9800'; // Orange - getting concerning
  } else {
    return '#F44336'; // Red - urgent watering needed
  }
};

/**
 * Determines if a plant needs a new photo (no photo or last photo > 30 days ago)
 */
export const needsPhoto = (lastPhotoDate?: string | null): boolean => {
  if (!lastPhotoDate) {
    return true;
  }

  const now = dayjs();
  const photoDate = dayjs(lastPhotoDate);
  const daysSince = now.diff(photoDate, 'day');

  return daysSince >= 30;
};

/**
 * Calculates appropriate text color (black or white) based on background luminance
 */
export const getTextColorForBackground = (backgroundColor: string): string => {
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};
