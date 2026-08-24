import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StartupErrorBoundary } from "@/components/ssa/startup-error-boundary";
import { SanketlyProvider } from "@/lib/sanketly-provider";

export default function RootLayout() {
  return (
    <StartupErrorBoundary>
      <SanketlyProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
      </SanketlyProvider>
    </StartupErrorBoundary>
  );
}
