import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'sanremobonus.com',
  appName: 'San Remo Bonus',
  webDir: 'dist',
  server: {
    url: 'https://app.sanremobonus.com',
    androidScheme: 'https',
    hostname: 'app.sanremobonus.com',
    // @ts-ignore
    deepLinks: [
      {
        url: 'https://app.sanremobonus.com',
        paths: ['/*']
      }
    ]
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff',
      overlaysWebView: true,
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#fdcb28',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    App: {
      launchMode: 'single-task',
      backgroundColor: '#fdcb28',
    }
  }
};

export default config;