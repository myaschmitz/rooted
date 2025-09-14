import { Reminder, ReminderInsert, ReminderUpdate } from '../types/Reminder';
import { supabase } from './SupabaseService';
import { HouseholdService } from './HouseholdService';
import { CacheService } from './CacheService';
import { CacheInvalidationService } from './CacheInvalidationService';
import { NotificationService } from './NotificationService';
import type { Database } from '../types/Database';

type ReminderRow = Database['public']['Tables']['reminders']['Row'];

export class ReminderService {
  static async getRemindersByPlantId(plantId: string): Promise<Reminder[]> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const cacheKey = `reminders-plant-${plantId}-${session.household_id}`;
    
    const cached = await CacheService.getCachedResponse<Reminder[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('plant_id', plantId)
      .eq('household_id', session.household_id)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error('Error fetching reminders:', error);
      throw new Error(`Failed to fetch reminders: ${error.message}`);
    }

    const reminders = (data || []) as Reminder[];
    await CacheService.cacheApiResponse(cacheKey, reminders, 5 * 60 * 1000);

    return reminders;
  }

  static async getAllActiveReminders(): Promise<Reminder[]> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const cacheKey = `reminders-active-${session.household_id}`;
    
    const cached = await CacheService.getCachedResponse<Reminder[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('household_id', session.household_id)
      .eq('is_active', true)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error('Error fetching active reminders:', error);
      throw new Error(`Failed to fetch active reminders: ${error.message}`);
    }

    const reminders = (data || []) as Reminder[];
    await CacheService.cacheApiResponse(cacheKey, reminders, 2 * 60 * 1000);

    return reminders;
  }

  static async getReminderById(id: string): Promise<Reminder | null> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const cacheKey = `reminder-${id}-${session.household_id}`;
    
    const cached = await CacheService.getCachedResponse<Reminder>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', id)
      .eq('household_id', session.household_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching reminder:', error);
      throw new Error(`Failed to fetch reminder: ${error.message}`);
    }

    const reminder = data as Reminder;
    await CacheService.cacheApiResponse(cacheKey, reminder, 10 * 60 * 1000);

    return reminder;
  }

  static async createReminder(reminderData: Omit<ReminderInsert, 'household_id'>): Promise<Reminder> {
    console.log('🟡 ReminderService.createReminder called with:', reminderData);
    console.trace('📍 ReminderService.createReminder call stack');
    
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const reminderInsert: ReminderInsert = {
      ...reminderData,
      household_id: session.household_id,
    };

    const { data, error } = await supabase
      .from('reminders')
      .insert(reminderInsert)
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      throw new Error(`Failed to create reminder: ${error.message}`);
    }

    const reminder = data as Reminder;

    // Schedule notification and update reminder with notification ID
    if (reminder.is_active) {
      try {
        const notificationId = await NotificationService.scheduleReminderNotification(reminder);
        
        if (notificationId) {
          await this.updateReminderNotificationId(reminder.id, notificationId);
          reminder.notification_id = notificationId;
        }
      } catch (notificationError) {
        console.error('Failed to schedule notification:', notificationError);
      }
    }

    await HouseholdService.logActivity('created reminder', {
      reminder_id: reminder.id,
      plant_id: reminder.plant_id,
      title: reminder.title,
    }, reminder.title);

    await CacheInvalidationService.invalidateOnUserAction('reminder_added', {
      entityId: reminder.id,
      additionalData: { plant_id: reminder.plant_id }
    });

    return reminder;
  }

  static async updateReminder(id: string, updates: ReminderUpdate): Promise<Reminder | null> {
    const oldReminder = await this.getReminderById(id);
    if (!oldReminder) return null;

    const reminderUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('reminders')
      .update(reminderUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error updating reminder:', error);
      throw new Error(`Failed to update reminder: ${error.message}`);
    }

    const reminder = data as Reminder;

    // If any scheduling-related fields changed, reschedule notification
    const schedulingFields = ['date', 'time', 'recurrence_type', 'recurrence_interval', 'recurrence_unit', 'is_active'];
    const needsReschedule = schedulingFields.some(field => field in updates);
    
    if (needsReschedule) {
      try {
        const newNotificationId = await this.rescheduleNotification(reminder);
        if (newNotificationId) {
          await this.updateReminderNotificationId(reminder.id, newNotificationId);
          reminder.notification_id = newNotificationId;
        }
      } catch (notificationError) {
        console.error('Failed to reschedule notification:', notificationError);
      }
    }

    await HouseholdService.logActivity('updated reminder', {
      reminder_id: reminder.id,
      updated_fields: Object.keys(updates),
    }, reminder.title);

    await CacheInvalidationService.invalidateOnUserAction('reminder_updated', {
      entityId: reminder.id,
      additionalData: { plant_id: reminder.plant_id }
    });

    return reminder;
  }

  static async deleteReminder(id: string): Promise<boolean> {
    const reminder = await this.getReminderById(id);
    
    // Cancel the scheduled notification if it exists
    if (reminder?.notification_id) {
      try {
        await NotificationService.cancelNotification(reminder.notification_id);
      } catch (error) {
        console.error('Failed to cancel notification:', error);
      }
    }
    
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting reminder:', error);
      throw new Error(`Failed to delete reminder: ${error.message}`);
    }

    if (reminder) {
      await HouseholdService.logActivity('deleted reminder', {
        reminder_id: reminder.id,
        plant_id: reminder.plant_id,
        title: reminder.title,
      }, reminder.title);

      await CacheInvalidationService.invalidateOnUserAction('reminder_deleted', {
        entityId: reminder.id,
        additionalData: { plant_id: reminder.plant_id }
      });
    }

    return true;
  }

  static async toggleReminderActive(id: string): Promise<Reminder | null> {
    const reminder = await this.getReminderById(id);
    if (!reminder) return null;
    
    return this.updateReminder(id, { is_active: !reminder.is_active });
  }

  private static async updateReminderNotificationId(reminderId: string, notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('reminders')
      .update({ notification_id: notificationId, updated_at: new Date().toISOString() })
      .eq('id', reminderId);

    if (error) {
      console.error('Error updating notification ID:', error);
    }
  }

  private static async rescheduleNotification(reminder: Reminder): Promise<string | null> {
    // Cancel existing notification if it exists
    if (reminder.notification_id) {
      try {
        await NotificationService.cancelNotification(reminder.notification_id);
      } catch (error) {
        console.error('Failed to cancel existing notification:', error);
      }
    }

    // Schedule new notification if reminder is active
    if (reminder.is_active) {
      try {
        return await NotificationService.scheduleReminderNotification(reminder);
      } catch (error) {
        console.error('Failed to schedule notification:', error);
        return null;
      }
    }

    return null;
  }
}