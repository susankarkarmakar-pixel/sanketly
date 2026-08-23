import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SanketlyProvider } from "@/lib/sanketly-provider";

export default function RootLayout() {
  return (
    <SanketlyProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </SanketlyProvider>
  );
}
