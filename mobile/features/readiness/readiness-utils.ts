import * as Notifications from "expo-notifications";
import { PermissionsAndroid, Platform } from "react-native";
import { NearbyNative } from "@/modules/ssa-nearby/src";
import { readinessCopy } from "./readiness-copy";
export { readinessCopy } from "./readiness-copy";

export type ReadinessStatus = "checking" | "ready" | "needs-attention" | "blocked" | "not-required";

export interface ReadinessCheck {
  id: "nearby" | "notifications" | "native-module" | "verified-peer";
  status: ReadinessStatus;
  required: boolean;
  title: string;
  detail: string;
}

export interface LocalReadinessSnapshot {
  checks: ReadinessCheck[];
  criticalReady: boolean;
  notificationReady: boolean;
  checkedAt: number;
}

function androidTransportPermissions(): string[] {
  if (Platform.OS !== "android") return [];
  const permissions: Array<string | undefined> = [];
  if (Platform.Version >= 31) {
    permissions.push(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    );
  }
  if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES) permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
  if (Platform.Version >= 29 && Platform.Version <= 31) permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  if (Platform.Version <= 28) permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
  return permissions.filter(Boolean) as string[];
}

export async function checkLocalReadiness(verifiedPeerCount = 0, transportReady = false): Promise<LocalReadinessSnapshot> {
  const now = Date.now();
  const nearbyPermissions = androidTransportPermissions();
  let nearbyGranted = true;
  if (nearbyPermissions.length > 0) {
    const results = await Promise.all(nearbyPermissions.map((permission) => PermissionsAndroid.check(permission as Parameters<typeof PermissionsAndroid.check>[0])));
    nearbyGranted = results.every(Boolean);
  }

  let notificationGranted = false;
  if (Platform.OS !== "web") {
    const permission = await Notifications.getPermissionsAsync();
    notificationGranted = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }

  const checks: ReadinessCheck[] = [
    {
      id: "nearby",
      status: nearbyGranted ? "ready" : "blocked",
      required: true,
      title: "Nearby permissions",
      detail: nearbyGranted ? "Bluetooth and nearby device access granted" : "Bluetooth or nearby device access is missing",
    },
    {
      id: "native-module",
      status: Platform.OS === "android" ? (NearbyNative.isAvailable ? (transportReady ? "ready" : "needs-attention") : "blocked") : "not-required",
      required: Platform.OS === "android",
      title: "SSA Nearby transport",
      detail: Platform.OS !== "android" ? "Android transport check is not required on this platform" : NearbyNative.isAvailable ? (transportReady ? "Native Nearby module is active" : "Native module is installed; start nearby search") : "Install the SSA Android test build with the Nearby module",
    },
    {
      id: "notifications",
      status: Platform.OS === "web" ? "not-required" : notificationGranted ? "ready" : "needs-attention",
      required: false,
      title: "Emergency notifications",
      detail: notificationGranted ? "Alert notifications are allowed" : "Mesh can continue, but tray notifications may be unavailable",
    },
    {
      id: "verified-peer",
      status: verifiedPeerCount > 0 ? "ready" : "needs-attention",
      required: false,
      title: "Verified nearby phone",
      detail: verifiedPeerCount > 0 ? `${verifiedPeerCount} verified bridge available` : "No verified bridge is nearby right now",
    },
  ];

  return {
    checks,
    criticalReady: nearbyGranted && (Platform.OS !== "android" || NearbyNative.isAvailable),
    notificationReady: notificationGranted || Platform.OS === "web",
    checkedAt: now,
  };
}

