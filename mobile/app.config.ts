import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Sanketly",
  slug: "sanketly",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  scheme: "sanketly",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.sanketly.mobile",
    infoPlist: {
      NSBluetoothAlwaysUsageDescription:
        "Sanketly uses Bluetooth to discover nearby devices and deliver encrypted messages without internet.",
      UIBackgroundModes: ["bluetooth-central", "bluetooth-peripheral"],
    },
  },
  android: {
    package: "com.sanketly.mobile",
    permissions: [
      "BLUETOOTH_SCAN",
      "BLUETOOTH_ADVERTISE",
      "BLUETOOTH_CONNECT",
      "ACCESS_FINE_LOCATION",
      "POST_NOTIFICATIONS",
    ],
  },
  plugins: ["expo-router", "expo-secure-store"],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
