import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PriorityChip, SsaCard } from "@/components/ssa/ssa-ui";
import { ALERT_KIND_LABELS, SSA_COLORS } from "@/constants/ssa";
import { useSanketly } from "@/lib/sanketly-provider";

function stateLabel(state: string): string {
  if (state === "delivered") return "পৌঁছানোর প্রমাণ পাওয়া গেছে";
  if (state === "queued") return "কাছের সেতুর অপেক্ষায় কিউতে আছে";
  if (state === "relaying") return "কাছের ফোনের মাধ্যমে এগিয়ে যাচ্ছে";
  if (state === "failed") return "পাঠানোর চেষ্টা ব্যর্থ";
  return "অবস্থা জানা নেই";
}

export default function AlertDetailScreen() {
  const { messageId } = useLocalSearchParams<{ messageId: string }>();
  const { alerts } = useSanketly();
  const record = alerts.find((entry) => entry.messageId === messageId);
  if (!record) return <ScreenContainer><View style={styles.missing}><Text style={styles.title}>বার্তা পাওয়া যায়নি</Text><Text style={styles.body}>এই ডিভাইসে রেকর্ডটি নেই বা এখনও লোড হচ্ছে।</Text></View></ScreenContainer>;
  const meta = ALERT_KIND_LABELS[record.alert.kind];
  return <ScreenContainer edges={["top", "left", "right", "bottom"]}>
    <View style={styles.content}>
      <View style={styles.header}><Text style={styles.eyebrow}>SSA / ALERT DETAIL</Text><Text onPress={() => router.back()} style={styles.back}>ফিরুন</Text></View>
      <SsaCard style={[styles.hero, { borderColor: `${meta.color}88` }]}><View style={[styles.kindBadge, { backgroundColor: `${meta.color}22` }]}><Text style={[styles.kind, { color: meta.color }]}>{meta.bn} · {meta.en}</Text></View><Text style={styles.title}>{record.alert.title}</Text><Text style={styles.village}>{record.alert.village}{record.alert.ward ? ` · ওয়ার্ড ${record.alert.ward}` : ""}</Text><View style={styles.statusRow}><PriorityChip priority={record.alert.priority} /><Text style={styles.state}>{stateLabel(record.deliveryState)}</Text></View></SsaCard>
      <SsaCard><Text style={styles.section}>বার্তার বিবরণ</Text><Text style={styles.body}>{record.alert.description}</Text></SsaCard>
      <SsaCard><Text style={styles.section}>সময়সীমা</Text><Text style={styles.body}>তৈরি: {new Date(record.alert.createdAt).toLocaleString("bn-IN")}</Text><Text style={styles.body}>মেয়াদ: {new Date(record.alert.expiresAt).toLocaleString("bn-IN")}</Text><Text style={styles.note}>মেয়াদ শেষ হলে SSA আর নতুন করে relay করার চেষ্টা করবে না।</Text></SsaCard>
    </View>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 18, gap: 13 },
  missing: { flex: 1, padding: 20, justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: SSA_COLORS.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  back: { color: SSA_COLORS.primary, fontSize: 13, fontWeight: "800" },
  hero: { gap: 9 },
  kindBadge: { borderRadius: 999, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 5 },
  kind: { fontSize: 11, fontWeight: "900" },
  title: { color: SSA_COLORS.foreground, fontSize: 24, lineHeight: 30, fontWeight: "900" },
  village: { color: SSA_COLORS.muted, fontSize: 13 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  state: { color: SSA_COLORS.muted, fontSize: 11, flex: 1 },
  section: { color: SSA_COLORS.foreground, fontSize: 14, fontWeight: "900", marginBottom: 9 },
  body: { color: SSA_COLORS.muted, fontSize: 13, lineHeight: 21 },
  note: { color: SSA_COLORS.faint, fontSize: 10, lineHeight: 15, marginTop: 9 },
});
