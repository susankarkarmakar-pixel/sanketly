import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PriorityChip, SsaButton, SsaCard } from "@/components/ssa/ssa-ui";
import { ALERT_KIND_LABELS, SSA_COLORS, SSA_COPY } from "@/constants/ssa";
import { useSanketly } from "@/lib/sanketly-provider";
import { deliveryLabel, sortAlertRecords } from "@/features/alerts/alert-utils";

export default function AlertsScreen() {
  const { alerts } = useSanketly();
  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>SSA / ALERT LOG</Text><Text style={styles.title}>{SSA_COPY.alerts}</Text><Text style={styles.subtitle}>এই ফোনে তৈরি বা পৌঁছানো সতর্কবার্তার রেকর্ড</Text></View><Pressable onPress={() => router.back()}><Text style={styles.close}>বন্ধ</Text></Pressable></View>
      <FlatList
        data={sortAlertRecords(alerts)}
        keyExtractor={(item) => item.messageId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<SsaButton label="নতুন জরুরি বার্তা" onPress={() => router.push("/alerts/compose")} />}
        ListEmptyComponent={<SsaCard style={styles.empty}><Text style={styles.emptyTitle}>এখনও কোনো সতর্কবার্তা নেই</Text><Text style={styles.emptyBody}>জরুরি অবস্থায় গঠনমূলক বার্তা পাঠান। বার্তাটি আগে এনক্রিপ্ট হয়ে কিউতে যাবে, তারপর কাছের যাচাই করা ফোনে পৌঁছানোর চেষ্টা হবে।</Text></SsaCard>}
        renderItem={({ item }) => {
          const meta = ALERT_KIND_LABELS[item.alert.kind];
          return <Pressable onPress={() => router.push({ pathname: "/alerts/[messageId]", params: { messageId: item.messageId } })} style={({ pressed }) => [styles.alertRow, pressed && styles.pressed]}>
            <View style={[styles.alertMark, { backgroundColor: meta.color }]} />
            <View style={styles.alertCopy}><View style={styles.rowTop}><Text style={styles.kind}>{meta.bn}</Text><PriorityChip priority={item.alert.priority} /></View><Text style={styles.alertTitle} numberOfLines={1}>{item.alert.title}</Text><Text style={styles.alertMeta} numberOfLines={1}>{item.alert.village} · {deliveryLabel(item.deliveryState)}</Text></View><Text style={styles.chevron}>›</Text>
          </Pressable>;
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingTop: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { color: SSA_COLORS.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: SSA_COLORS.foreground, fontSize: 25, fontWeight: "900", marginTop: 5 },
  subtitle: { color: SSA_COLORS.muted, fontSize: 12, marginTop: 5 },
  close: { color: SSA_COLORS.primary, fontSize: 13, fontWeight: "800", paddingTop: 3 },
  list: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28, gap: 11 },
  empty: { marginTop: 4 },
  emptyTitle: { color: SSA_COLORS.foreground, fontSize: 15, fontWeight: "900", marginBottom: 8 },
  emptyBody: { color: SSA_COLORS.muted, fontSize: 12, lineHeight: 19 },
  alertRow: { flexDirection: "row", alignItems: "center", backgroundColor: SSA_COLORS.surface, borderColor: SSA_COLORS.border, borderWidth: 1, borderRadius: 16, padding: 13 },
  alertMark: { width: 7, height: 48, borderRadius: 4, marginRight: 12 },
  alertCopy: { flex: 1, gap: 3 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kind: { color: SSA_COLORS.primary, fontSize: 11, fontWeight: "900" },
  alertTitle: { color: SSA_COLORS.foreground, fontSize: 14, fontWeight: "800" },
  alertMeta: { color: SSA_COLORS.faint, fontSize: 11 },
  chevron: { color: SSA_COLORS.faint, fontSize: 25, marginLeft: 8 },
  pressed: { opacity: 0.72 },
});
