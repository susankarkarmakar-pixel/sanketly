import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { StartupErrorBoundary } from "@/components/ssa/startup-error-boundary";
import { SsaThemeProvider, useSsaTheme } from "@/lib/ssa-theme";
import { SanketlyProvider } from "@/lib/sanketly-provider";
import { getSsaNotificationMessageId } from "@/lib/notifications";

function RouterShell() {
  const { resolvedTheme } = useSsaTheme();
  return (
    <SanketlyProvider>
      <NotificationNavigationBridge />
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
    </SanketlyProvider>
  );
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
