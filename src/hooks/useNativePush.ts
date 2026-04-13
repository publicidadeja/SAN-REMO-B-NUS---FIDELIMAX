import { useEffect } from 'react';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';
import { useAppStore } from '../store/useAppStore';
import { FidelimaxApiService } from '../api/fidelimax';

export const useNativePush = () => {
  const { user, token: authToken, fcmToken, setFcmToken } = useAppStore();

  // 1. Initialize Listeners and Permissions immediately on mount if Native
  useEffect(() => {
    const initializePush = async () => {
      try {
        const info = await Device.getInfo();
        const isNative = info.platform !== 'web';

        if (!isNative) {
          console.log('[NativePush] Running on web, skipping native registration.');
          return;
        }

        console.log('[NativePush] Initializing native push logic...');

        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          console.log('[NativePush] Requesting permissions...');
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('[NativePush] Notification permissions not granted.');
          return;
        }

        // Register with Apple / Google to get the token
        await PushNotifications.register();

        // Listeners
        PushNotifications.addListener('registration', (token: Token) => {
          console.log('[NativePush] Token received:', token.value);
          setFcmToken(token.value);
        });

        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('[NativePush] Registration error:', error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('[NativePush] Notification received:', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
          console.log('[NativePush] Action performed:', action);
          if (action.notification.data?.url) {
            window.location.href = action.notification.data.url;
          }
        });

      } catch (err) {
        console.error('[NativePush] Initialization error:', err);
      }
    };

    initializePush();

    return () => {
      PushNotifications.removeAllListeners().catch(() => {});
    };
  }, [setFcmToken]);

  // 2. Register with Backend whenever User + Token + Auth are available
  useEffect(() => {
    if (!user || !authToken || !fcmToken) return;

    const registerWithBackend = async () => {
      try {
        console.log('[NativePush] Associating token with logged in user:', user.cpf);
        const info = await Device.getInfo();
        await FidelimaxApiService.registerPushToken(user.cpf, fcmToken, `${info.model} (${info.platform})`);
      } catch (err) {
        console.error('[NativePush] Failed to register token with backend:', err);
      }
    };

    registerWithBackend();
  }, [user?.cpf, authToken, fcmToken]);
};
