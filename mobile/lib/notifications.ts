import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { createStructuredAlert } from "@sanketly/domain";
import type { StructuredAlert } from "@sanketly/domain";
import { alertKindLabel, priorityLabel, type SsaLanguage } from "./ssa-theme";

export const SSA_EMERGENCY_CHANNEL_ID = "ssa-emergency-v1";
const NOTIFICATIONS_ENABLED_KEY = "ssa.notifications-enabled.v1";

// Emergency alerts must remain visible while SSA is in the foreground. Android
// users can still control the channel from system settings.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const COPY: Record<SsaLanguage, { channelName: string; title: string; expires: string }> = {
  bn: {
    channelName: "SSA জরুরি সতর্কবার্তা",
    title: "নতুন জরুরি বার্তা",
    expires: "বার্তাটির মেয়াদ শেষ হয়ে গেছে",
  },
  en: {
    channelName: "SSA emergency alerts",
    title: "New emergency alert",
    expires: "This alert has expired",
  },
  hi: {
    channelName: "SSA आपातकालीन अलर्ट",
    title: "नया आपातकालीन अलर्ट",
    expires: "इस अलर्ट की अवधि समाप्त हो गई है",
  },
};

export async function ensureSsaNotificationChannel(language: SsaLanguage = "bn"): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(SSA_EMERGENCY_CHANNEL_ID, {
    name: COPY[language].channelName,
    description: "High-priority notifications for verified SSA emergency messages.",
    importance: Notifications.AndroidImportance.MAX,
    bypassDnd: false,
    enableVibrate: true,
    vibrationPattern: [0, 250, 120, 250, 120, 500],
    enableLights: true,
    lightColor: "#B42332",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    sound: "default",
  });
}

export async function requestSsaNotificationPermission(language: SsaLanguage = "bn"): Promise<boolean> {
  if (Platform.OS === "web") return false;
  await ensureSsaNotificationChannel(language);
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function loadSsaNotificationsEnabled(): Promise<boolean> {
  const saved = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  return saved !== "0";
}

export async function saveSsaNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? "1" : "0");
}

export function buildSsaNotificationBody(alert: StructuredAlert, language: SsaLanguage): string {
  return `${alert.title} · ${priorityLabel(alert.priority, language)} · ${alertKindLabel(alert.kind, language)} · ${alert.village}`;
}

export async function notifyReceivedAlert(
  alert: StructuredAlert,
  messageId: string,
  language: SsaLanguage,
): Promise<boolean> {
  if (Platform.OS === "web" || alert.expiresAt <= Date.now()) return false;
  const permitted = await requestSsaNotificationPermission(language);
  if (!permitted) return false;

  const copy = COPY[language];
  await Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: buildSsaNotificationBody(alert, language),
      sound: "default",
      data: {
        type: "ssa-alert",
        messageId,
        alertId: alert.alertId,
        expiresAt: alert.expiresAt,
      },
      ...(Platform.OS === "android" ? { channelId: SSA_EMERGENCY_CHANNEL_ID } : { interruptionLevel: "timeSensitive" as const }),
    },
    trigger: null,
  });
  return true;
}

export async function notifyTestAlert(language: SsaLanguage): Promise<boolean> {
  const now = Date.now();
  const alert = createStructuredAlert({
    alertId: `test-alert-${now}`,
    kind: "infrastructure",
    priority: "normal",
    title: language === "bn" ? "SSA পরীক্ষা বিজ্ঞপ্তি" : language === "hi" ? "SSA परीक्षण सूचना" : "SSA test notification",
    description: language === "bn" ? "এটি শুধু ফোনের notification পরীক্ষা করার জন্য। এটি আসল জরুরি alert নয়।" : language === "hi" ? "यह केवल फोन की notification जाँचने के लिए है। यह वास्तविक आपातकालीन alert नहीं है।" : "This only tests phone notifications. It is not a real emergency alert.",
    village: language === "bn" ? "পরীক্ষা এলাকা" : language === "hi" ? "परीक्षण क्षेत्र" : "Test area",
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000,
  });
  return notifyReceivedAlert(alert, `test-message-${now}`, language);
}

export function getSsaNotificationMessageId(response: Notifications.NotificationResponse | null): string | null {
  const data = response?.notification.request.content.data;
  if (!data || typeof data !== "object") return null;
  const messageId = (data as { messageId?: unknown }).messageId;
  return typeof messageId === "string" && messageId.length > 0 ? messageId : null;
}

export { COPY as SSA_NOTIFICATION_COPY };
