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
  // Prevent double scheduling same reminder within 5 seconds
  private static recentlyScheduled = new Set<string>();
  
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
    const callTime = new Date().toISOString();
    console.log('🔥 NotificationService.scheduleReminderNotification called at:', callTime);
    console.log('   Reminder ID:', reminder.id);
    console.log('   Recently scheduled set size:', this.recentlyScheduled.size);
    console.log('   Recently scheduled contains this reminder?', this.recentlyScheduled.has(reminder.id));
    
    // TEMPORARILY DISABLED: Prevent double scheduling with atomic check-and-set
    // Testing if deduplication logic is causing the immediate firing issue
    console.log('🔧 DEDUPLICATION TEMPORARILY DISABLED FOR DEBUGGING');
    
    // if (this.recentlyScheduled.has(reminder.id)) {
    //   console.log('⚠️  Reminder already scheduled recently, skipping duplicate:', reminder.id);
    //   console.log('   Returning null to prevent duplicate scheduling');
    //   return null;
    // }
    
    // // Immediately add to prevent race conditions
    // this.recentlyScheduled.add(reminder.id);
    
    // // Remove after longer timeout to be extra safe
    // setTimeout(() => {
    //   this.recentlyScheduled.delete(reminder.id);
    // }, 10000);
    
    console.trace('🔍 Call stack for notification scheduling');
    
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

      console.log('📋 DETAILED TRIGGER ANALYSIS:');
      console.log('   Trigger object:', JSON.stringify(trigger, null, 2));
      console.log('   Trigger type:', typeof trigger.date);
      console.log('   Trigger value:', trigger.date);
      
      if (trigger && 'date' in trigger) {
        let triggerTime: number;
        
        if (typeof trigger.date === 'number') {
          triggerTime = trigger.date;
          console.log('   Using timestamp:', triggerTime);
        } else {
          triggerTime = (trigger.date as Date).getTime();
          console.log('   Using Date object, converted to timestamp:', triggerTime);
        }
        
        const triggerDate = new Date(triggerTime);
        console.log('   Will fire at:', triggerDate.toISOString());
        console.log('   That is in:', (triggerTime - Date.now()) / (1000 * 60), 'minutes');
        console.log('   Current time for comparison:', new Date().toISOString());
      }
      
      console.log('📨 About to call Notifications.scheduleNotificationAsync...');
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger,
      });
      console.log('📨 scheduleNotificationAsync completed, returned ID:', notificationId);

      console.log('✅ Notification scheduled successfully with ID:', notificationId);
      console.log('🔔 Notification content:', JSON.stringify(notificationContent, null, 2));
      
      // Enhanced verification with multiple attempts
      setTimeout(async () => {
        try {
          const scheduled = await Notifications.getAllScheduledNotificationsAsync();
          const found = scheduled.find(n => n.identifier === notificationId);
          
          if (found) {
            console.log('✅ Verified notification is in scheduled queue:', notificationId);
            if (found.trigger && 'date' in found.trigger) {
              const scheduledDate = new Date(found.trigger.date);
              console.log('📅 Scheduled to fire at:', scheduledDate.toLocaleString());
            }
          } else {
            console.log('❌ WARNING: Notification not found in scheduled queue:', notificationId);
            console.log('🔍 Total scheduled notifications:', scheduled.length);
            
            console.log('🚨 REAL DEVICE ISSUE: Notification fired immediately instead of waiting');
            console.log('📱 This indicates a bug in the scheduling logic or trigger format');
          }
        } catch (e) {
          console.log('❌ Error verifying scheduled notification:', e);
        }
      }, 500); // Increased delay to allow notification system to process
      
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

    // Create reminder date with explicit milliseconds and seconds for precision
    const reminderDate = new Date(year, month - 1, day, hour, minute, 0, 0);
    const now = new Date();
    
    console.log('Constructed reminder date (local):', reminderDate.toString());
    console.log('Constructed reminder date (UTC):', reminderDate.toISOString());
    console.log('Current time (local):', now.toString());
    console.log('Current time (UTC):', now.toISOString());
    console.log('Device timezone offset (minutes):', reminderDate.getTimezoneOffset());
    
    const timeDiffMs = reminderDate.getTime() - now.getTime();
    const timeDiffMinutes = timeDiffMs / (1000 * 60);
    console.log('Time difference (ms):', timeDiffMs);
    console.log('Time difference (minutes):', timeDiffMinutes);
    console.log('Is reminder date in future?', reminderDate > now);
    
    // iOS Simulator check and warning
    if (Platform.OS === 'ios' && __DEV__) {
      console.log('⚠️  iOS Simulator detected in development mode');
      console.log('📱 Notifications may fire immediately instead of at scheduled time');
      console.log('💡 Test on a real device for accurate notification scheduling');
    }

    let finalTrigger: Notifications.NotificationTriggerInput | null = null;

    switch (reminder.recurrence_type) {
      case 'none':
        console.log('📅 Processing ONE-TIME notification');
        
        // Check if notification is in the past
        if (reminderDate <= now) {
          console.warn('❌ Cannot schedule notification in the past:', reminderDate.toISOString());
          return null;
        }
        
        // Add minimum delay check (30 seconds) to prevent immediate firing
        const minDelayMs = 30 * 1000; // 30 seconds
        if (timeDiffMs < minDelayMs) {
          console.warn('⚠️  Notification scheduled too close to current time (< 30s)');
          console.warn('🔧 Adding minimum delay to prevent immediate firing');
          const adjustedTimestamp = now.getTime() + minDelayMs;
          finalTrigger = { date: adjustedTimestamp };
          console.log('✅ One-time trigger created with minimum delay using timestamp:', adjustedTimestamp);
          console.log('  Equivalent date:', new Date(adjustedTimestamp).toISOString());
        } else {
          // Try using timestamp instead of Date object
          const timestamp = reminderDate.getTime();
          finalTrigger = { date: timestamp };
          console.log('✅ One-time trigger created using timestamp:', timestamp);
          console.log('  Equivalent date:', new Date(timestamp).toISOString());
        }
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
      
      // Safety check: ensure trigger is in the future
      if (triggerDate <= now) {
        console.error('❌ CRITICAL: Trigger date is in the past! This will fire immediately.');
        console.error('  Trigger date:', triggerDate.toISOString());
        console.error('  Current time:', now.toISOString());
        return null; // Don't schedule past notifications
      }
      
      // Keep as Date object - Expo expects Date, not timestamp
      console.log('✅ Using Date object trigger:', triggerDate.toISOString());
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
    console.log(`Platform: ${Platform.OS}`);
    console.log(`Development mode: ${__DEV__}`);
    console.log(`Total scheduled: ${scheduled.length}`);
    
    if (scheduled.length === 0) {
      console.log('🚨 NO NOTIFICATIONS SCHEDULED! This suggests they fired immediately or were never scheduled properly.');
      if (Platform.OS === 'ios' && __DEV__) {
        console.log('🔧 iOS Simulator Issue: This is expected behavior in development');
        console.log('📱 Notifications will work correctly on real devices');
        console.log('⚡ Notifications in simulator often fire immediately instead of waiting');
      } else {
        console.log('🤔 This could indicate a real scheduling issue');
      }
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

  static async testNotificationScheduling(): Promise<void> {
    console.log('🧪 === NOTIFICATION SYSTEM TEST ===');
    
    const hasPermission = await this.requestPermissions();
    console.log('Permissions granted:', hasPermission);
    
    if (!hasPermission) {
      console.log('❌ Cannot test - permissions not granted');
      return;
    }
    
    // Test scheduling a notification 1 minute from now
    const testDate = new Date(Date.now() + 60 * 1000); // 1 minute from now
    const testContent = {
      title: 'Test Notification',
      body: 'This is a test notification to verify scheduling works',
    };
    
    console.log('📅 Scheduling test notification for:', testDate.toISOString());
    
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: testContent,
        trigger: { date: testDate },
      });
      
      console.log('✅ Test notification scheduled with ID:', notificationId);
      
      // Check if it appears in the queue
      setTimeout(async () => {
        const scheduled = await this.getScheduledNotifications();
        const found = scheduled.find(n => n.identifier === notificationId);
        
        if (found) {
          console.log('✅ Test notification found in queue - scheduling working correctly');
        } else {
          console.log('❌ Test notification not found in queue');
          if (Platform.OS === 'ios' && __DEV__) {
            console.log('📱 This is expected in iOS Simulator - notifications fire immediately');
          }
        }
        console.log('🧪 === END TEST ===');
      }, 1000);
      
    } catch (error) {
      console.error('❌ Test notification failed:', error);
    }
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