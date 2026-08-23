import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Sanket Setu Alert (SSA)",
  slug: "sanket-setu-alert",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  scheme: "ssa",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "in.sanketsetu.alert",
    infoPlist: {
      NSBluetoothAlwaysUsageDescription:
        "Sanket Setu Alert uses nearby connections to discover devices and relay emergency alerts without internet.",
      UIBackgroundModes: ["bluetooth-central", "bluetooth-peripheral"],
    },
  },
  android: {
    package: "in.sanketsetu.alert",
    permissions: [
      "BLUETOOTH_SCAN",
      "BLUETOOTH_ADVERTISE",
      "BLUETOOTH_CONNECT",
      "NEARBY_WIFI_DEVICES",
      "ACCESS_FINE_LOCATION",
      "ACCESS_WIFI_STATE",
      "CHANGE_WIFI_STATE",
      "POST_NOTIFICATIONS",
    ],
  },
  plugins: ["expo-router", "expo-secure-store"],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
