import type { MeshPeer } from "@sanketly/protocol";
import type { AlertPriority, StructuredAlertKind } from "@sanketly/domain";
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { ALERT_KIND_LABELS } from "@/constants/ssa";
import { alertKindLabel, priorityLabel, useSsaTheme } from "@/lib/ssa-theme";

export function SsaCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useSsaTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

export function StatusPill({ state, detail }: { state: string; detail?: string }) {
  const { colors, text } = useSsaTheme();
  const active = state === "ready" || state === "starting";
  const error = state === "error";
  return (
    <View style={[styles.statusPill, active ? { borderColor: colors.success, backgroundColor: colors.surfaceRaised } : error ? { borderColor: colors.danger, backgroundColor: colors.criticalSurface } : { borderColor: colors.border, backgroundColor: colors.input }]}>
      <View style={[styles.statusDot, { backgroundColor: active ? colors.success : error ? colors.danger : colors.faint }]} />
      <Text style={[styles.statusText, { color: colors.foreground }]}>{active ? text.connected : error ? text.needsAttention : text.offline}</Text>
      {detail ? <Text numberOfLines={1} style={[styles.statusDetail, { color: colors.muted }]}> · {detail}</Text> : null}
    </View>
  );
}

export function SsaButton({ label, onPress, variant = "primary", disabled, style, ...props }: PressableProps & { label: string; variant?: "primary" | "secondary" | "danger"; style?: StyleProp<ViewStyle> }) {
  const { colors } = useSsaTheme();
  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, variant === "primary" ? { backgroundColor: colors.primary } : variant === "danger" ? { backgroundColor: colors.danger } : { borderColor: colors.border, borderWidth: 1, backgroundColor: "transparent" }, disabled && styles.buttonDisabled, pressed && styles.pressed, style]}
    >
      <Text style={[styles.buttonLabel, { color: variant === "primary" ? colors.primaryInk : variant === "danger" ? colors.primaryInk : colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

export function AlertTypeTile({ kind, selected, onPress }: { kind: StructuredAlertKind; selected: boolean; onPress: () => void }) {
  const { colors, language } = useSsaTheme();
  const meta = ALERT_KIND_LABELS[kind];
  const primaryLabel = alertKindLabel(kind, language);
  const secondaryLabel = language === "en" ? meta.bn : language === "hi" ? meta.en : meta.en;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={primaryLabel} onPress={onPress} style={({ pressed }) => [styles.alertTile, { borderColor: selected ? meta.color : colors.border, backgroundColor: selected ? `${meta.color}22` : colors.surface }, pressed && styles.pressed]}>
      <View style={[styles.alertIcon, { backgroundColor: `${meta.color}33` }]}><Text style={[styles.alertIconText, { color: meta.color }]}>{meta.en.slice(0, 1)}</Text></View>
      <Text style={[styles.alertTilePrimary, { color: colors.foreground }]}>{primaryLabel}</Text>
      <Text style={[styles.alertTileSecondary, { color: colors.faint }]}>{secondaryLabel}</Text>
    </Pressable>
  );
}

export function PriorityChip({ priority }: { priority: AlertPriority }) {
  const { colors, language } = useSsaTheme();
  const color = priority === "critical" ? colors.danger : priority === "high" ? colors.warning : colors.success;
  return <View style={[styles.priorityChip, { borderColor: `${color}88`, backgroundColor: `${color}22` }]}><Text style={[styles.priorityText, { color }]}>{priorityLabel(priority, language)}</Text></View>;
}

export function PeerRow({ peer, onPress }: { peer: MeshPeer; onPress?: () => void }) {
  const { colors, language } = useSsaTheme();
  const status = peer.verified ? (language === "bn" ? "পরিচয় যাচাই হয়েছে" : language === "hi" ? "पहचान सत्यापित" : "Identity verified") : (language === "bn" ? "পরিচয় যাচাই হচ্ছে" : language === "hi" ? "पहचान सत्यापित हो रही है" : "Identity being verified");
  const content = (
    <>
      <View style={[styles.peerAvatar, { backgroundColor: colors.surfaceRaised }]}><Text style={[styles.peerAvatarText, { color: colors.primary }]}>{(peer.displayName ?? "SSA").slice(0, 1).toUpperCase()}</Text></View>
      <View style={styles.peerCopy}>
        <Text style={[styles.peerName, { color: colors.foreground }]}>{peer.displayName ?? (language === "bn" ? "কাছের SSA ফোন" : language === "hi" ? "नज़दीकी SSA फ़ोन" : "Nearby SSA phone")}</Text>
        <Text style={[styles.peerMeta, { color: colors.faint }]}>{status} · {peer.connectionState}</Text>
      </View>
      <Text style={[styles.chevron, { color: colors.faint }]}>›</Text>
    </>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.peerRow, { borderBottomColor: colors.border }, pressed && styles.pressed]}>{content}</Pressable> : <View style={[styles.peerRow, { borderBottomColor: colors.border }]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 16 },
  statusPill: { flexDirection: "row", alignItems: "center", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, alignSelf: "flex-start", maxWidth: "100%" },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  statusText: { fontSize: 12, fontWeight: "700" },
  statusDetail: { fontSize: 11, flexShrink: 1 },
  button: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonLabel: { fontSize: 14, fontWeight: "800" },
  buttonDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.985 }] },
  alertTile: { width: "31.5%", minHeight: 102, borderWidth: 1, borderRadius: 15, padding: 9, alignItems: "center", justifyContent: "center", gap: 4 },
  alertIcon: { width: 31, height: 31, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  alertIconText: { fontSize: 14, fontWeight: "900" },
  alertTilePrimary: { fontSize: 12, fontWeight: "800", textAlign: "center" },
  alertTileSecondary: { fontSize: 9, textAlign: "center" },
  priorityChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  priorityText: { fontSize: 10, fontWeight: "800" },
  peerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  peerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  peerAvatarText: { fontSize: 16, fontWeight: "800" },
  peerCopy: { flex: 1, marginLeft: 12, gap: 3 },
  peerName: { fontSize: 14, fontWeight: "800" },
  peerMeta: { fontSize: 11 },
  chevron: { fontSize: 26, fontWeight: "300" },
});
