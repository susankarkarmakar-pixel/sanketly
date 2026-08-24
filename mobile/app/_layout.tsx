import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StartupErrorBoundary } from "@/components/ssa/startup-error-boundary";
import { SsaThemeProvider, useSsaTheme } from "@/lib/ssa-theme";
import { SanketlyProvider } from "@/lib/sanketly-provider";

function RouterShell() {
  const { resolvedTheme } = useSsaTheme();
  return (
    <SanketlyProvider>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
    </SanketlyProvider>
  );
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
