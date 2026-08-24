import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SsaTabIcon } from "@/components/ssa/ssa-tab-icon";
import { SSA_COLORS } from "@/constants/ssa";
import { useSanketly } from "@/lib/sanketly-provider";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { alerts } = useSanketly();
  const bottomPadding = Platform.OS === "web" ? 8 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: SSA_COLORS.primary,
        tabBarInactiveTintColor: SSA_COLORS.faint,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarStyle: [styles.bar, { height: 62 + bottomPadding, paddingBottom: bottomPadding }],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ড্যাশবোর্ড",
          tabBarAccessibilityLabel: "ড্যাশবোর্ড খুলুন",
          tabBarIcon: ({ color, size, focused }) => <SsaTabIcon name="home" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "সতর্কবার্তা",
          tabBarAccessibilityLabel: "সতর্কবার্তা খুলুন",
          tabBarBadge: alerts.length > 0 ? alerts.length : undefined,
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: ({ color, size, focused }) => <SsaTabIcon name="notifications-none" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: "নেটওয়ার্ক",
          tabBarAccessibilityLabel: "নেটওয়ার্ক খুলুন",
          tabBarIcon: ({ color, size, focused }) => <SsaTabIcon name="hub" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "সেটিংস",
          tabBarAccessibilityLabel: "সেটিংস খুলুন",
          tabBarIcon: ({ color, size, focused }) => <SsaTabIcon name="settings" color={color} size={size} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: SSA_COLORS.background, borderTopColor: SSA_COLORS.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 },
  item: { minHeight: 52 },
  label: { fontSize: 10, fontWeight: "800", lineHeight: 13 },
  badge: { backgroundColor: SSA_COLORS.danger, color: "#2D1118", fontSize: 9, fontWeight: "900" },
});
