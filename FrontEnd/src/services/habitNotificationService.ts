/**
 * Servicio de Notificaciones Nativas del Teléfono para Hábitos Diarios.
 * Gestiona recordatorios programados a las 20:00, 21:00, 22:00, 23:00, 23:30 y 23:45.
 * Verifica antes de cada notificación si los hábitos ya han sido completados en el día
 * y cancela todas las notificaciones restantes una vez que el paciente los registra.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { storageService } from './storageService';
import { habitService } from './habitService';
import { formatToMySqlDate } from '../utils/date';

export const HABIT_NOTIFICATION_CHANNEL_ID = 'habitos-recordatorios';

export interface HabitReminderSlot {
  hour: number;
  minute: number;
  id: string;
  title: string;
  body: string;
}

/**
 * Horarios estipulados de recordatorio nocturno para hábitos diarios
 */
export const HABIT_REMINDER_SLOTS: readonly HabitReminderSlot[] = [
  {
    hour: 20,
    minute: 0,
    id: 'habit_reminder_20_00',
    title: 'Registro de Hábitos 🌿',
    body: 'Tómate 1 minuto para registrar tu descanso, hidratación y bienestar de hoy.',
  },
  {
    hour: 21,
    minute: 0,
    id: 'habit_reminder_21_00',
    title: '¿Cómo estuvo tu día? ✨',
    body: 'Aún no has registrado tus hábitos diarios. ¡Tu constancia es clave para tu psicólogo/a!',
  },
  {
    hour: 22,
    minute: 0,
    id: 'habit_reminder_22_00',
    title: 'Pausa consciente de la noche 🌙',
    body: 'Recuerda hacer tu check-in diario en PsicoHábitos antes de descansar.',
  },
  {
    hour: 23,
    minute: 0,
    id: 'habit_reminder_23_00',
    title: 'Tus hábitos del día te esperan ⏰',
    body: 'Falta poco para cerrar el día. Registra cómo te sentiste hoy.',
  },
  {
    hour: 23,
    minute: 30,
    id: 'habit_reminder_23_30',
    title: '¡Últimos 30 minutos del día! ⏳',
    body: 'Quedan 30 min para completar tus hábitos antes de que se bloquee el registro de hoy.',
  },
  {
    hour: 23,
    minute: 45,
    id: 'habit_reminder_23_45',
    title: '¡Último aviso de hoy! ⚠️',
    body: 'Quedan solo 15 minutos para que termine el día. Registra tus hábitos ahora.',
  },
];

let isInitialized = false;
let isChannelConfigured = false;
let navigationCallback: (() => void) | null = null;

export const habitNotificationService = {
  /**
   * Inicializa el manejador de notificaciones y canales nativos en Android/iOS.
   */
  async init(onNavigateToHabits?: () => void): Promise<void> {
    if (isInitialized) return;
    isInitialized = true;

    if (onNavigateToHabits) {
      navigationCallback = onNavigateToHabits;
    }

    // Configura cómo se comportan las notificaciones al llegar al dispositivo
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const isHabitReminder = notification.request.content.data?.type === 'habit_reminder';
        const isTest = notification.request.content.data?.isTest === true;

        // Si es una notificación de prueba directa, se muestra siempre
        if (isTest) {
          return {
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          };
        }

        // Comprobación individual de última hora: ¿Ya están completados los hábitos hoy?
        if (isHabitReminder) {
          const isCompleted = await habitNotificationService.isHabitCompletedToday();
          if (isCompleted) {
            // Si ya los rellenó, cancela y suprime silenciosamente la notificación
            await habitNotificationService.cancelHabitReminders();
            return {
              shouldShowBanner: false,
              shouldShowList: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
            };
          }
        }

        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });

    // En Android los canales personalizados son necesarios para APKs/Standalone.
    // En Expo Go (StoreClient), NotificationsChannelsProvider no existe a nivel nativo y crashea con NullPointerException;
    // Expo Go utiliza automáticamente su propio canal nativo por defecto para notificaciones locales.
    const isExpoGo =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any).appOwnership === 'expo';

    if (Platform.OS === 'android' && !isExpoGo) {
      try {
        await Notifications.setNotificationChannelAsync(HABIT_NOTIFICATION_CHANNEL_ID, {
          name: 'Recordatorios de Hábitos Diarios',
          description: 'Avisos nocturnos para completar la evaluación de hábitos antes de medianoche',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0F613B',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
        isChannelConfigured = true;
      } catch (error) {
        // En caso de que falle en algún dispositivo, la app continúa sin bloquearse
      }
    }

    // Listener para cuando el usuario toca la notificación
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.targetTab === 'habitos' || data?.type === 'habit_reminder') {
        if (navigationCallback) {
          navigationCallback();
        }
      }
    });

    // Solicita permisos nativos
    await this.requestPermissions();
  },

  /**
   * Actualiza el callback de navegación hacia la pestaña de Hábitos.
   */
  setNavigationCallback(callback: () => void): void {
    navigationCallback = callback;
  },

  /**
   * Solicita permisos de notificación al sistema operativo.
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
        return true;
      }
      const request = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      return request.granted || request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    } catch (error) {
      console.warn('[habitNotificationService] Error solicitando permisos:', error);
      return false;
    }
  },

  /**
   * Comprueba si los hábitos del día ya están completados (vía caché local o servidor MySQL).
   */
  async isHabitCompletedToday(userIdentifier?: string): Promise<boolean> {
    const todayStr = formatToMySqlDate();

    // 1. Verificación rápida en almacenamiento seguro local
    const lastSavedDate = await storageService.getLastCompletedHabitsDate();
    if (lastSavedDate === todayStr) {
      return true;
    }

    // 2. Si se proporciona identificador de usuario, consulta autoritativa con MySQL
    if (userIdentifier) {
      try {
        const status = await habitService.getTodayStatus(userIdentifier);
        if (status.success && status.completedToday) {
          const dateToSave = status.serverDate || todayStr;
          await storageService.saveLastCompletedHabitsDate(dateToSave);
          return true;
        }
      } catch (error) {
        console.warn('[habitNotificationService] Error consultando todayStatus:', error);
      }
    }

    return false;
  },

  /**
   * Cancela todos los recordatorios de hábitos pendientes en el sistema operativo.
   */
  async cancelHabitReminders(): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const cancelPromises = scheduled
        .filter((n) => n.identifier.startsWith('habit_reminder_') || n.content.data?.type === 'habit_reminder')
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier));

      await Promise.all(cancelPromises);
    } catch (error) {
      console.warn('[habitNotificationService] Error cancelando notificaciones:', error);
    }
  },

  /**
   * Se ejecuta inmediatamente cuando el paciente guarda con éxito sus hábitos diarios.
   * Cancela todas las notificaciones restantes del día (ej. si guardó a las 21:45, cancela 22:00, 23:00, etc.).
   */
  async onHabitsCompletedToday(completedDate?: string): Promise<void> {
    const dateStr = completedDate || formatToMySqlDate();
    await storageService.saveLastCompletedHabitsDate(dateStr);
    await this.cancelHabitReminders();
  },

  /**
   * Sincroniza y programa los recordatorios del día que aún no hayan pasado,
   * únicamente si los hábitos de hoy NO han sido completados.
   */
  async syncHabitReminders(userIdentifier?: string, userRole = 'paciente'): Promise<void> {
    // Solo los pacientes registran hábitos diarios
    if (userRole !== 'paciente') {
      await this.cancelHabitReminders();
      return;
    }

    const isCompleted = await this.isHabitCompletedToday(userIdentifier);

    // Si ya completó los hábitos de hoy, asegura que no haya notificaciones programadas
    if (isCompleted) {
      await this.cancelHabitReminders();
      return;
    }

    // Si aún no los completa, programa en paralelo los slots que son futuros hoy
    const now = new Date();
    const todayStr = formatToMySqlDate(now);

    const futureSlots = HABIT_REMINDER_SLOTS
      .map((slot) => ({
        slot,
        targetDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), slot.hour, slot.minute, 0),
      }))
      .filter(({ targetDate }) => targetDate.getTime() > now.getTime());

    const schedulePromises = futureSlots.map(({ slot, targetDate }) => {
      const identifier = `${slot.id}_${todayStr}`;
      return this.scheduleSlotNotification(slot, targetDate, identifier, todayStr);
    });

    await Promise.all(schedulePromises);
  },

  /**
   * Programa una notificación individual para un horario específico.
   */
  async scheduleSlotNotification(
    slot: HabitReminderSlot,
    targetDate: Date,
    identifier: string,
    todayStr: string
  ): Promise<void> {
    try {
      // Cancela si ya existía para evitar duplicados
      await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: slot.title,
          body: slot.body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: 'habit_reminder',
            targetTab: 'habitos',
            slotId: slot.id,
            date: todayStr,
            scheduledHour: slot.hour,
            scheduledMinute: slot.minute,
          },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: targetDate,
          ...(isChannelConfigured ? { channelId: HABIT_NOTIFICATION_CHANNEL_ID } : {}),
        },
      });
    } catch (error) {
      console.warn(`[habitNotificationService] Error programando slot ${slot.id}:`, error);
    }
  },

  /**
   * Envía una notificación nativa de prueba en N segundos (por defecto 3s).
   * Permite comprobar inmediatamente el banner nativo, sonido, vibración y navegación.
   */
  async sendTestNotificationNow(delaySeconds = 3): Promise<void> {
    await this.requestPermissions();

    const targetDate = new Date(Date.now() + Math.max(delaySeconds, 1) * 1000);
    const identifier = `test_habit_reminder_${Date.now()}`;

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: 'Registro de Hábitos (Prueba) 🌿',
        body: '¡Hola! Este es un recordatorio de prueba. Tómate 1 minuto para registrar tus hábitos de hoy.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'habit_reminder',
          targetTab: 'habitos',
          isTest: true,
        },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: targetDate,
        ...(isChannelConfigured ? { channelId: HABIT_NOTIFICATION_CHANNEL_ID } : {}),
      },
    });
  },
};
