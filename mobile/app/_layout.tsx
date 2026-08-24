import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { StartupErrorBoundary } from "@/components/ssa/startup-error-boundary";
import { SsaThemeProvider, useSsaTheme } from "@/lib/ssa-theme";
import { SanketlyProvider } from "@/lib/sanketly-provider";
import { getSsaNotificationMessageId } from "@/lib/notifications";

const WIZARD_COMPLETE_KEY = "ssa.readiness-wizard-complete.v1";
const WIZARD_SKIPPED_KEY = "ssa.readiness-wizard-skipped.v1";

function RouterShell() {
  const { resolvedTheme } = useSsaTheme();
  return (
    <SanketlyProvider>
      <NotificationNavigationBridge />
      <FirstRunReadinessGate />
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
    </SanketlyProvider>
  );
}

function FirstRunReadinessGate() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (pathname !== "/") return;
    let active = true;
    void Promise.all([AsyncStorage.getItem(WIZARD_COMPLETE_KEY), AsyncStorage.getItem(WIZARD_SKIPPED_KEY), Notifications.getLastNotificationResponseAsync()]).then(([complete, skipped, response]) => {
      if (!active || complete === "1" || skipped === "1" || getSsaNotificationMessageId(response)) return;
      router.replace("/readiness");
    }).catch(() => undefined);
    return () => { active = false; };
  }, [pathname, router]);
  return null;
}

function NotificationNavigationBridge() {
  const router = useRouter();
  const handledMessageIds = useRef(new Set<string>());

  useEffect(() => {
    const openAlert = (response: Notifications.NotificationResponse | null) => {
      const messageId = getSsaNotificationMessageId(response);
      if (!messageId || handledMessageIds.current.has(messageId)) return;
      handledMessageIds.current.add(messageId);
      router.push(`/alerts/${encodeURIComponent(messageId)}`);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(openAlert);
    void Notifications.getLastNotificationResponseAsync().then(openAlert).catch(() => undefined);
    return () => subscription.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  return (
    <StartupErrorBoundary>
      <SsaThemeProvider>
        <RouterShell />
      </SsaThemeProvider>
    </StartupErrorBoundary>
  );
}
