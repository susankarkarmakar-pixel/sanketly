import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SsaTabIcon } from "@/components/ssa/ssa-tab-icon";
import { useSsaTheme } from "@/lib/ssa-theme";
import { useSanketly } from "@/lib/sanketly-provider";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { alerts } = useSanketly();
  const { colors, text, language } = useSsaTheme();
  const bottomPadding = Platform.OS === "web" ? 8 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarStyle: [styles.bar, { height: 62 + bottomPadding, paddingBottom: bottomPadding, backgroundColor: colors.background, borderTopColor: colors.border }],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: text.dashboard,
          tabBarAccessibilityLabel: language === "bn" ? "ড্যাশবোর্ড খুলুন" : language === "hi" ? "डैशबोर्ड खोलें" : "Open dashboard",
          tabBarIcon: ({ color, size, focused }) => <SsaTabIcon name="home" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: text.alerts,
          tabBarAccessibilityLabel: language === "bn" ? "সতর্কবার্তা খুলুন" : language === "hi" ? "अलर्ट खोलें" : "Open alerts",
          tabBarBadge: alerts.length > 0 ? alerts.length : undefined,
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: ({ color, size, focused }) => <SsaTabIcon name="notifications-none" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: text.network,
          tabBarAccessibilityLabel: language === "bn" ? "নেটওয়ার্ক খুলুন" : language === "hi" ? "नेटवर्क खोलें" : "Open network",
          tabBarIcon: ({ color, size, focused }) => <SsaTabIcon name="hub" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: text.settings,
          tabBarAccessibilityLabel: language === "bn" ? "সেটিংস খুলুন" : language === "hi" ? "सेटिंग्स खोलें" : "Open settings",
          tabBarIcon: ({ color, size, focused }) => <SsaTabIcon name="settings" color={color} size={size} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 },
  item: { minHeight: 52 },
  label: { fontSize: 10, fontWeight: "800", lineHeight: 13 },
  badge: { backgroundColor: "#B42332", color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
});
