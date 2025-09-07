export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface Reminder {
  id: string;
  plant_id: string;
  title: string;
  description: string;
  date: string; // ISO date string
  time: string; // HH:MM format
  recurrence_type: RecurrenceType;
  recurrence_interval?: number; // For custom recurrence (every X days/weeks/months)
  recurrence_unit?: 'days' | 'weeks' | 'months'; // For custom recurrence
  notification_id?: string; // Expo notification ID for cancellation
  is_active: boolean;
  household_id: string;
  created_at: string;
  updated_at: string;
}

export type ReminderInsert = Omit<Reminder, 'id' | 'created_at' | 'updated_at'>;
export type ReminderUpdate = Partial<Omit<Reminder, 'id' | 'created_at'>>;