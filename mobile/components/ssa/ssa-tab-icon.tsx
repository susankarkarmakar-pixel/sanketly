import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps } from "react";
import { SSA_COLORS } from "@/constants/ssa";

type TabIconName = "home" | "notifications-none" | "hub" | "settings";

type SsaTabIconProps = {
  name: TabIconName;
  color?: string;
  size?: number;
  focused?: boolean;
};

const ICON_MAP: Record<TabIconName, ComponentProps<typeof MaterialIcons>["name"]> = {
  home: "home",
  "notifications-none": "notifications-none",
  hub: "hub",
  settings: "settings",
};

export function SsaTabIcon({ name, color = SSA_COLORS.faint, size = 22, focused = false }: SsaTabIconProps) {
  return <MaterialIcons name={ICON_MAP[name]} size={size} color={focused ? SSA_COLORS.primary : color} />;
}
