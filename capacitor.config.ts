import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ae.nasec.erp",
  appName: "NASEC ERP",
  webDir: "dist/public",
  // Allow loading the bundled web app from the file:// scheme
  server: {
    androidScheme: "https",
    iosScheme: "nasec",
    // For local dev with the Vite dev server, uncomment & set your LAN IP:
    // url: "http://192.168.1.10:3000",
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    BackgroundGeolocation: {
      // Tune in production via the plugin's setConfig()
      distanceFilter: 10,        // metres before the OS dispatches a new location
      stopOnTerminate: false,    // continue tracking after app close
      startOnBoot: true,         // resume tracking on device boot
      heartbeatInterval: 60,
      foregroundService: true,   // shows persistent Android notification (required for background)
    },
  },
};

export default config;
