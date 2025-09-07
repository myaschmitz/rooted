import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Reminder } from '../types/Reminder';
import { PlantService } from './PlantService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }

  static async scheduleReminderNotification(reminder: Reminder): Promise<string | null> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Notification permissions not granted');
    }

    try {
      const plant = await PlantService.getPlantById(reminder.plant_id);
      if (!plant) {
        throw new Error('Plant not found for reminder');
      }

      const plantName = plant.name || plant.type;
      const notificationContent = {
        title: `${plantName} - ${reminder.title}`,
        body: reminder.description,
        data: {
          reminderId: reminder.id,
          plantId: reminder.plant_id,
          type: 'plant_reminder',
        },
      };

      const trigger = this.createNotificationTrigger(reminder);
      if (!trigger) {
        return null;
      }

      console.log('Scheduling notification with trigger:', JSON.stringify(trigger, null, 2));
      if (trigger && 'date' in trigger) {
        const triggerDate = new Date(trigger.date as number);
        console.log('Notification will fire at:', triggerDate.toISOString());
        console.log('That is in', ((trigger.date as number) - Date.now()) / (1000 * 60), 'minutes');
      }
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger,
      });

      console.log('Notification scheduled successfully:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  private static createNotificationTrigger(reminder: Reminder): Notifications.NotificationTriggerInput | null {
    console.log('🔔 === NOTIFICATION TRIGGER DEBUG ===');
    console.log('Input reminder:', {
      id: reminder.id,
      date: reminder.date,
      time: reminder.time,
      recurrence_type: reminder.recurrence_type
    });

    const [year, month, day] = reminder.date.split('-').map(Number);
    const [hour, minute] = reminder.time.split(':').map(Number);
    
    console.log('Parsed components:', { year, month, day, hour, minute });

    const reminderDate = new Date(year, month - 1, day, hour, minute);
    const now = new Date();
    
    console.log('Constructed reminder date:', reminderDate.toISOString());
    console.log('Current time:', now.toISOString());
    console.log('Time difference (minutes):', (reminderDate.getTime() - now.getTime()) / (1000 * 60));
    console.log('Is reminder date in future?', reminderDate > now);

    let finalTrigger: Notifications.NotificationTriggerInput | null = null;

    switch (reminder.recurrence_type) {
      case 'none':
        console.log('📅 Processing ONE-TIME notification');
        // One-time notification - only schedule if in the future
        if (reminderDate <= now) {
          console.warn('❌ Cannot schedule notification in the past:', reminderDate.toISOString());
          return null;
        }
        finalTrigger = { date: reminderDate };
        console.log('✅ One-time trigger created for:', reminderDate.toISOString());
        break;
      
      case 'daily':
        console.log('📅 Processing DAILY notification');
        // Calculate next daily occurrence
        const nextDaily = this.getNextDailyOccurrence(hour, minute);
        finalTrigger = { date: nextDaily };
        console.log('✅ Daily trigger created for:', nextDaily.toISOString());
        break;
      
      case 'weekly':
        console.log('📅 Processing WEEKLY notification');
        // Calculate next weekly occurrence
        const targetWeekday = reminderDate.getDay(); // 0-6 (Sunday-Saturday)
        const nextWeekly = this.getNextWeeklyOccurrence(targetWeekday, hour, minute);
        finalTrigger = { date: nextWeekly };
        console.log('✅ Weekly trigger created for:', nextWeekly.toISOString());
        break;
      
      case 'monthly':
        console.log('📅 Processing MONTHLY notification');
        // Calculate next monthly occurrence  
        const targetDay = reminderDate.getDate();
        const nextMonthly = this.getNextMonthlyOccurrence(targetDay, hour, minute);
        finalTrigger = { date: nextMonthly };
        console.log('✅ Monthly trigger created for:', nextMonthly.toISOString());
        break;
      
      case 'custom':
        console.log('📅 Processing CUSTOM notification');
        if (!reminder.recurrence_interval || !reminder.recurrence_unit) {
          finalTrigger = reminderDate > now ? { date: reminderDate } : null;
          console.log('✅ Custom (fallback) trigger:', finalTrigger ? reminderDate.toISOString() : 'null');
        } else {
          // Calculate next custom occurrence
          const nextCustom = this.getNextCustomOccurrence(
            reminderDate, 
            reminder.recurrence_interval, 
            reminder.recurrence_unit
          );
          finalTrigger = { date: nextCustom };
          console.log('✅ Custom trigger created for:', nextCustom.toISOString());
        }
        break;
      
      default:
        console.log('📅 Processing DEFAULT case');
        finalTrigger = reminderDate > now ? { date: reminderDate } : null;
        console.log('✅ Default trigger:', finalTrigger ? reminderDate.toISOString() : 'null');
        break;
    }

    if (finalTrigger && 'date' in finalTrigger) {
      const triggerDate = finalTrigger.date as Date;
      const minutesFromNow = (triggerDate.getTime() - now.getTime()) / (1000 * 60);
      console.log('🚀 FINAL TRIGGER will fire in:', minutesFromNow.toFixed(1), 'minutes');
      
      // Convert to timestamp to avoid any potential Date object issues
      finalTrigger = { date: triggerDate.getTime() };
      console.log('🚀 Using timestamp trigger:', triggerDate.getTime());
    }

    console.log('🔔 === END NOTIFICATION DEBUG ===\n');
    return finalTrigger;
  }

  private static getNextDailyOccurrence(hour: number, minute: number): Date {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    
    console.log('⏰ Daily calculation:');
    console.log('  Now:', now.toISOString());
    console.log('  Today at target time:', next.toISOString());
    console.log('  Target time has passed today?', next <= now);
    
    // If time has passed today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
      console.log('  Scheduling for tomorrow:', next.toISOString());
    } else {
      console.log('  Scheduling for today:', next.toISOString());
    }
    
    return next;
  }

  private static getNextWeeklyOccurrence(targetWeekday: number, hour: number, minute: number): Date {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    
    const currentWeekday = now.getDay();
    let daysUntilTarget = targetWeekday - currentWeekday;
    
    // If target day is today but time has passed, schedule for next week
    if (daysUntilTarget === 0 && next <= now) {
      daysUntilTarget = 7;
    }
    // If target day has passed this week, schedule for next week
    else if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    }
    
    next.setDate(next.getDate() + daysUntilTarget);
    return next;
  }

  private static getNextMonthlyOccurrence(targetDay: number, hour: number, minute: number): Date {
    const now = new Date();
    const next = new Date();
    next.setDate(targetDay);
    next.setHours(hour, minute, 0, 0);
    
    // If target day has passed this month or is today but time has passed
    if (next <= now) {
      // Move to next month
      next.setMonth(next.getMonth() + 1);
      // Handle edge case where target day doesn't exist in next month (e.g. Feb 31)
      if (next.getDate() !== targetDay) {
        // Set to last day of the month
        next.setDate(0);
      }
    }
    
    return next;
  }

  private static getNextCustomOccurrence(
    startDate: Date, 
    interval: number, 
    unit: 'days' | 'weeks' | 'months'
  ): Date {
    const now = new Date();
    let next = new Date(startDate);
    
    // Keep adding intervals until we get a future date
    while (next <= now) {
      switch (unit) {
        case 'days':
          next.setDate(next.getDate() + interval);
          break;
        case 'weeks':
          next.setDate(next.getDate() + (interval * 7));
          break;
        case 'months':
          next.setMonth(next.getMonth() + interval);
          break;
      }
    }
    
    return next;
  }

  static async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  static async debugScheduledNotifications(): Promise<void> {
    const scheduled = await this.getScheduledNotifications();
    console.log('=== SCHEDULED NOTIFICATIONS DEBUG ===');
    console.log(`Total scheduled: ${scheduled.length}`);
    
    if (scheduled.length === 0) {
      console.log('🚨 NO NOTIFICATIONS SCHEDULED! This suggests they fired immediately or were never scheduled properly.');
      console.log('🤔 This is likely an iOS Simulator issue - notifications don\'t work properly in simulator during development.');
      console.log('💡 Try testing on a real device or in a production build.');
    }
    
    scheduled.forEach((notification, index) => {
      console.log(`\n[${index + 1}] ID: ${notification.identifier}`);
      console.log(`Title: ${notification.content.title}`);
      console.log(`Trigger:`, JSON.stringify(notification.trigger, null, 2));
      
      if ('date' in notification.trigger && notification.trigger.date) {
        const date = new Date(notification.trigger.date);
        console.log(`Scheduled for: ${date.toLocaleString()}`);
        const now = new Date();
        const diffMinutes = (date.getTime() - now.getTime()) / (1000 * 60);
        console.log(`Time until fire: ${diffMinutes.toFixed(1)} minutes`);
      }
    });
    console.log('=== END DEBUG ===');
  }

  static getDefaultReminderTime(): string {
    return '09:00';
  }

  static formatRecurrenceText(reminder: Reminder): string {
    switch (reminder.recurrence_type) {
      case 'none':
        return 'One time';
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'custom':
        if (reminder.recurrence_interval && reminder.recurrence_unit) {
          const unit = reminder.recurrence_unit === 'days' ? 'day' : 
                      reminder.recurrence_unit === 'weeks' ? 'week' : 'month';
          const plural = reminder.recurrence_interval > 1 ? unit + 's' : unit;
          return `Every ${reminder.recurrence_interval} ${plural}`;
        }
        return 'Custom';
      default:
        return 'Unknown';
    }
  }
}