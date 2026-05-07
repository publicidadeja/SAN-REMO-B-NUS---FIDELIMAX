import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import type { NotificationActionPerformedEvent } from '@capacitor-firebase/messaging';
import type { ActionPerformed, Token } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';
import { useAppStore } from '../store/useAppStore';
import { FidelimaxApiService } from '../api/fidelimax';

const getNotificationUrl = (data: unknown) => {
  if (!data || typeof data !== 'object') return undefined;

  const url = (data as Record<string, unknown>).url;
  return typeof url === 'string' && url ? url : undefined;
};

export const useNativePush = () => {
  const { user, token: authToken, fcmToken, setFcmToken } = useAppStore();

  // 1. Initialize Listeners and Permissions immediately on mount if Native
  useEffect(() => {
    type CleanupListeners = () => void;
    let cleanupListeners: CleanupListeners = () => {};
    let cancelled = false;

    const setCleanupListeners = (cleanup: CleanupListeners) => {
      if (cancelled) {
        cleanup();
        return;
      }

      cleanupListeners = cleanup;
    };

    const initializeFirebaseMessaging = async (): Promise<CleanupListeners> => {
      const { isSupported } = await FirebaseMessaging.isSupported();
      if (!isSupported) {
        console.warn('[NativePush] Firebase Messaging is not supported on this device.');
        return () => {};
      }

      FirebaseMessaging.addListener('tokenReceived', ({ token }) => {
        console.log('[NativePush] FCM token received.');
        setFcmToken(token);
      });

      FirebaseMessaging.addListener('notificationReceived', (event) => {
        console.log('[NativePush] Notification received:', event.notification);
      });

      FirebaseMessaging.addListener('notificationActionPerformed', (action: NotificationActionPerformedEvent) => {
        console.log('[NativePush] Action performed:', action);
        const url = getNotificationUrl(action.notification.data);
        if (url) {
          window.location.href = url;
        }
      });

      let permStatus = await FirebaseMessaging.checkPermissions();

      if (permStatus.receive === 'prompt') {
        console.log('[NativePush] Requesting permissions...');
        permStatus = await FirebaseMessaging.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[NativePush] Notification permissions not granted.');
        return () => FirebaseMessaging.removeAllListeners().catch(() => {});
      }

      const { token } = await FirebaseMessaging.getToken();
      if (token) {
        console.log('[NativePush] FCM token loaded.');
        setFcmToken(token);
      }

      return () => FirebaseMessaging.removeAllListeners().catch(() => {});
    };

    const initializeLegacyAndroidPush = async (): Promise<CleanupListeners> => {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      PushNotifications.addListener('registration', (token: Token) => {
        console.log('[NativePush] Legacy Android FCM token received.');
        setFcmToken(token.value);
      });

      PushNotifications.addListener('registrationError', (error: unknown) => {
        console.error('[NativePush] Legacy Android registration error:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[NativePush] Legacy Android notification received:', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('[NativePush] Legacy Android action performed:', action);
        const url = getNotificationUrl(action.notification.data);
        if (url) {
          window.location.href = url;
        }
      });

      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        console.log('[NativePush] Requesting legacy Android permissions...');
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[NativePush] Legacy Android notification permissions not granted.');
        return () => PushNotifications.removeAllListeners().catch(() => {});
      }

      await PushNotifications.register();

      return () => PushNotifications.removeAllListeners().catch(() => {});
    };

    const initializePush = async () => {
      try {
        const info = await Device.getInfo();
        const isNative = info.platform !== 'web';

        if (!isNative) {
          console.log('[NativePush] Running on web, skipping native registration.');
          return;
        }

        console.log('[NativePush] Initializing native push logic...');

        if (Capacitor.isPluginAvailable('FirebaseMessaging')) {
          const cleanup = await initializeFirebaseMessaging();
          setCleanupListeners(cleanup);
          return;
        }

        if (info.platform === 'android' && Capacitor.isPluginAvailable('PushNotifications')) {
          const cleanup = await initializeLegacyAndroidPush();
          setCleanupListeners(cleanup);
          return;
        }

        console.warn(`[NativePush] No native push plugin available for ${info.platform}.`);
      } catch (err) {
        console.error('[NativePush] Initialization error:', err);
      }
    };

    initializePush();

    return () => {
      cancelled = true;
      cleanupListeners();
    };
  }, [setFcmToken]);

  // 2. Register with Backend whenever User + Token + Auth are available
  useEffect(() => {
    if (!user || !authToken || !fcmToken) return;

    const registerWithBackend = async () => {
      try {
        console.log('[NativePush] Associating token with logged in user:', user.cpf);
        const info = await Device.getInfo();
        await FidelimaxApiService.registerPushToken(user.cpf, fcmToken, `${info.model} (${info.platform}:fcm)`);
      } catch (err) {
        console.error('[NativePush] Failed to register token with backend:', err);
      }
    };

    registerWithBackend();
  }, [user?.cpf, authToken, fcmToken]);
};
