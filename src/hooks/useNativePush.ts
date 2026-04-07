import { useEffect } from 'react';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';
import { useAppStore } from '../store/useAppStore';
import { FidelimaxApiService } from '../api/fidelimax';

export const useNativePush = () => {
  const { user, token: authToken } = useAppStore();

  useEffect(() => {
    // Only proceed if we have a logged-in consumer
    if (!user || !authToken || user.role !== 'user') return;

    const initializePush = async () => {
      try {
        const info = await Device.getInfo();
        const isNative = info.platform !== 'web';

        if (!isNative) {
          console.log('[NativePush] Running on web, skipping native registration.');
          return;
        }

        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('[NativePush] Notification permissions not granted.');
          return;
        }

        // Register with Apple / Google to get the token
        await PushNotifications.register();

        // Listeners
        PushNotifications.addListener('registration', async (token: Token) => {
          console.log('[NativePush] Token registered:', token.value);
          try {
            await FidelimaxApiService.registerPushToken(user.cpf, token.value, `${info.model} (${info.platform})`);
          } catch (err) {
            console.error('[NativePush] Failed to register token with backend:', err);
          }
        });

        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('[NativePush] Registration error:', error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('[NativePush] Notification received:', notification);
          // Foreground notifications are usually shown automatically by the OS 
          // or can be customized here.
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
          console.log('[NativePush] Action performed:', action);
          // Redirect user based on notification data
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
      PushNotifications.removeAllListeners().catch(() => {
        // Silently ignore errors on web or if plugin not available
      });
    };
  }, [user?.cpf, authToken]);
};
