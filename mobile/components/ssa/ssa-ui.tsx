import type { MeshPeer } from "@sanketly/protocol";
import type { StructuredAlertKind } from "@sanketly/domain";
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { ALERT_KIND_LABELS, ALERT_PRIORITY_LABELS, SSA_COLORS } from "@/constants/ssa";

export function SsaCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatusPill({ state, detail }: { state: string; detail?: string }) {
  const active = state === "ready" || state === "starting";
  const error = state === "error";
  return (
    <View style={[styles.statusPill, active ? styles.statusActive : error ? styles.statusError : styles.statusIdle]}>
      <View style={[styles.statusDot, active ? styles.dotActive : error ? styles.dotError : styles.dotIdle]} />
      <Text style={styles.statusText}>{active ? "সংযোগ সক্রিয়" : error ? "মনোযোগ দরকার" : "অফলাইন"}</Text>
      {detail ? <Text numberOfLines={1} style={styles.statusDetail}> · {detail}</Text> : null}
    </View>
  );
}

export function SsaButton({ label, onPress, variant = "primary", disabled, style, ...props }: PressableProps & { label: string; variant?: "primary" | "secondary" | "danger"; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, variant === "primary" ? styles.buttonPrimary : variant === "danger" ? styles.buttonDanger : styles.buttonSecondary, disabled && styles.buttonDisabled, pressed && styles.pressed, style]}
    >
      <Text style={[styles.buttonLabel, variant === "primary" ? styles.buttonLabelPrimary : variant === "danger" ? styles.buttonLabelDanger : styles.buttonLabelSecondary]}>{label}</Text>
    </Pressable>
  );
}

export function AlertTypeTile({ kind, selected, onPress }: { kind: StructuredAlertKind; selected: boolean; onPress: () => void }) {
  const meta = ALERT_KIND_LABELS[kind];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.alertTile, { borderColor: selected ? meta.color : SSA_COLORS.border, backgroundColor: selected ? `${meta.color}22` : SSA_COLORS.surface }, pressed && styles.pressed]}>
      <View style={[styles.alertIcon, { backgroundColor: `${meta.color}33` }]}><Text style={[styles.alertIconText, { color: meta.color }]}>{meta.en.slice(0, 1)}</Text></View>
      <Text style={styles.alertTileBn}>{meta.bn}</Text>
      <Text style={styles.alertTileEn}>{meta.en}</Text>
    </Pressable>
  );
}

export function PriorityChip({ priority }: { priority: keyof typeof ALERT_PRIORITY_LABELS }) {
  const meta = ALERT_PRIORITY_LABELS[priority];
  return <View style={[styles.priorityChip, { borderColor: `${meta.color}88`, backgroundColor: `${meta.color}22` }]}><Text style={[styles.priorityText, { color: meta.color }]}>{meta.bn}</Text></View>;
}

export function PeerRow({ peer, onPress }: { peer: MeshPeer; onPress?: () => void }) {
  const content = (
    <>
      <View style={styles.peerAvatar}><Text style={styles.peerAvatarText}>{(peer.displayName ?? "SSA").slice(0, 1).toUpperCase()}</Text></View>
      <View style={styles.peerCopy}>
        <Text style={styles.peerName}>{peer.displayName ?? "কাছের SSA ফোন"}</Text>
        <Text style={styles.peerMeta}>{peer.verified ? "পরিচয় যাচাই হয়েছে" : "পরিচয় যাচাই হচ্ছে"} · {peer.connectionState}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [styles.peerRow, pressed && styles.pressed]}>{content}</Pressable> : <View style={styles.peerRow}>{content}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: SSA_COLORS.surface, borderColor: SSA_COLORS.border, borderWidth: 1, borderRadius: 20, padding: 16 },
  statusPill: { flexDirection: "row", alignItems: "center", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, alignSelf: "flex-start", maxWidth: "100%" },
  statusActive: { borderColor: "#3B8668", backgroundColor: "#163A31" },
  statusError: { borderColor: "#87505A", backgroundColor: "#3B202D" },
  statusIdle: { borderColor: SSA_COLORS.border, backgroundColor: "#12192C" },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  dotActive: { backgroundColor: SSA_COLORS.success },
  dotError: { backgroundColor: SSA_COLORS.danger },
  dotIdle: { backgroundColor: SSA_COLORS.faint },
  statusText: { color: SSA_COLORS.foreground, fontSize: 12, fontWeight: "700" },
  statusDetail: { color: SSA_COLORS.muted, fontSize: 11, flexShrink: 1 },
  button: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonPrimary: { backgroundColor: SSA_COLORS.primary },
  buttonSecondary: { borderColor: "#506491", borderWidth: 1, backgroundColor: "transparent" },
  buttonDanger: { backgroundColor: SSA_COLORS.danger },
  buttonLabel: { fontSize: 14, fontWeight: "800" },
  buttonLabelPrimary: { color: SSA_COLORS.primaryInk },
  buttonLabelSecondary: { color: SSA_COLORS.primary },
  buttonLabelDanger: { color: "#2D1118" },
  buttonDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.985 }] },
  alertTile: { width: "31.5%", minHeight: 102, borderWidth: 1, borderRadius: 15, padding: 9, alignItems: "center", justifyContent: "center", gap: 4 },
  alertIcon: { width: 31, height: 31, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  alertIconText: { fontSize: 14, fontWeight: "900" },
  alertTileBn: { color: SSA_COLORS.foreground, fontSize: 12, fontWeight: "800", textAlign: "center" },
  alertTileEn: { color: SSA_COLORS.faint, fontSize: 9, textAlign: "center" },
  priorityChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  priorityText: { fontSize: 10, fontWeight: "800" },
  peerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomColor: SSA_COLORS.border, borderBottomWidth: StyleSheet.hairlineWidth },
  peerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#273B69", alignItems: "center", justifyContent: "center" },
  peerAvatarText: { color: "#B9C9FF", fontSize: 16, fontWeight: "800" },
  peerCopy: { flex: 1, marginLeft: 12, gap: 3 },
  peerName: { color: SSA_COLORS.foreground, fontSize: 14, fontWeight: "800" },
  peerMeta: { color: SSA_COLORS.faint, fontSize: 11 },
  chevron: { color: SSA_COLORS.faint, fontSize: 26, fontWeight: "300" },
});
