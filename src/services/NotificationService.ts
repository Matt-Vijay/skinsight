import { logger } from '@/config/logger';

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for notification preferences
const NOTIFICATION_ENABLED_KEY = 'notification_enabled';
const REMINDERS_ENABLED_KEY = 'reminders_enabled';
const REMINDER_TIME_KEY = 'reminder_time';

// Default reminder time (8:00 PM)
const DEFAULT_REMINDER_HOUR = 20;
const DEFAULT_REMINDER_MINUTE = 0;

// Define the SchedulableTriggerInputTypes enum if not exported by expo-notifications
enum SchedulableTriggerInputTypes {
  DAILY = 'daily',
  CALENDAR = 'calendar',
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions from the user
 * @returns A promise that resolves to the permission status
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  let finalStatus = existingStatus;
  
  // If we don't have permission yet, ask for it
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  // Return true if permission is granted, false otherwise
  return finalStatus === 'granted';
};

/**
 * Schedule a daily reminder notification
 * @param hour Hour of the day (0-23)
 * @param minute Minute of the hour (0-59)
 * @returns The notification identifier
 */
export const scheduleDailyReminder = async (
  hour: number = DEFAULT_REMINDER_HOUR,
  minute: number = DEFAULT_REMINDER_MINUTE
): Promise<string> => {
  // Cancel any existing reminders first
  await cancelAllScheduledReminders();
  
  // Check if we have permission
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    throw new Error('Notification permission not granted');
  }
  
  // Set up the daily trigger
  const trigger: Notifications.NotificationTriggerInput = {
    type: SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
  };
  
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Skincare Reminder',
      body: 'Time for your daily skincare routine!',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger,
  });
  
  // Save the reminder time to AsyncStorage
  await AsyncStorage.setItem(REMINDER_TIME_KEY, JSON.stringify({ hour, minute }));
  
  return notificationId;
};

/**
 * Enable or disable all notifications
 * @param enabled Whether notifications should be enabled
 */
export const setNotificationsEnabled = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, JSON.stringify(enabled));
  
  if (!enabled) {
    // If disabling notifications, cancel all scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
  } else {
    // If enabling notifications, check if reminders are also enabled
    const remindersEnabled = await getRemindersEnabled();
    if (remindersEnabled) {
      // If reminders are enabled, reschedule them
      await restoreReminders();
    }
  }
};

/**
 * Check if notifications are enabled
 * @returns Boolean indicating if notifications are enabled
 */
export const getNotificationsEnabled = async (): Promise<boolean> => {
  const enabled = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
  return enabled === null ? true : JSON.parse(enabled); // Default to true
};

/**
 * Enable or disable daily reminders
 * @param enabled Whether daily reminders should be enabled
 */
export const setRemindersEnabled = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(REMINDERS_ENABLED_KEY, JSON.stringify(enabled));
  
  if (enabled) {
    // If enabling reminders, check if notifications are also enabled
    const notificationsEnabled = await getNotificationsEnabled();
    if (notificationsEnabled) {
      // If notifications are enabled, schedule the reminder
      await restoreReminders();
    }
  } else {
    // If disabling reminders, cancel all scheduled reminders
    await cancelAllScheduledReminders();
  }
};

/**
 * Check if reminders are enabled
 * @returns Boolean indicating if reminders are enabled
 */
export const getRemindersEnabled = async (): Promise<boolean> => {
  const enabled = await AsyncStorage.getItem(REMINDERS_ENABLED_KEY);
  return enabled === null ? true : JSON.parse(enabled); // Default to true
};

/**
 * Cancel all scheduled reminder notifications
 */
export const cancelAllScheduledReminders = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Restore scheduled reminders based on saved preferences
 */
export const restoreReminders = async (): Promise<void> => {
  try {
    const reminderTimeJSON = await AsyncStorage.getItem(REMINDER_TIME_KEY);
    if (reminderTimeJSON) {
      const { hour, minute } = JSON.parse(reminderTimeJSON);
      await scheduleDailyReminder(hour, minute);
    } else {
      // Use default time if no saved time exists
      await scheduleDailyReminder();
    }
  } catch (error) {
    logger.error('Error restoring reminders:', error);
  }
};

/**
 * Send an immediate test notification
 */
export const sendTestNotification = async (): Promise<void> => {
  // Check if we have permission
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    throw new Error('Notification permission not granted');
  }
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test Notification',
      body: 'This is a test notification from your skincare app!',
      sound: true,
    },
    trigger: null, // Send immediately
  });
};

/**
 * Initialize the notification service and restore any saved preferences
 */
export const initializeNotifications = async (): Promise<void> => {
  try {
    // Request permissions early
    await requestNotificationPermissions();
    
    // Check saved preferences
    const notificationsEnabled = await getNotificationsEnabled();
    const remindersEnabled = await getRemindersEnabled();
    
    // If both are enabled, restore reminders
    if (notificationsEnabled && remindersEnabled) {
      await restoreReminders();
    }
  } catch (error) {
    logger.error('Error initializing notifications:', error);
  }
};
