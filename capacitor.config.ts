import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jobsightapp.app',
  appName: 'JobSight',
  webDir: 'dist',
  server: {
    // Enable this for development with live reload
    // url: 'http://localhost:5173',
    // cleartext: true,
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#2563eb',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#ffffff',
      // iOS-specific splash screen settings
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#2563eb',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      // iOS Camera plugin settings
      presentationStyle: 'fullscreen',
    },
    Geolocation: {
      // High accuracy for construction site tracking
    },
  },
  ios: {
    // Content inset handling for safe areas (notch, home indicator)
    contentInset: 'always',
    // Prefer mobile viewport over desktop
    preferredContentMode: 'mobile',
    // URL scheme for deep linking
    scheme: 'jobsight',
    // Disable link preview for cleaner UX
    allowsLinkPreview: false,
    // Scroll deceleration for native feel
    scrollEnabled: true,
    // Minimum iOS version (iOS 14+)
    // minVersion: '14.0', // Set in Xcode project
    // Path to load the web app
    path: undefined, // Uses default public folder
    // Configure WKWebView - enable for development debugging
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
    // Limiter for memory usage - restrict navigation to app domains
    limitsNavigationsToAppBoundDomains: true,
    // Background color while content loads
    backgroundColor: '#2563eb',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set to true for development
  },
};

export default config;
