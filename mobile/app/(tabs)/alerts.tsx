import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PriorityChip, SsaButton, SsaCard } from "@/components/ssa/ssa-ui";
import { ALERT_KIND_LABELS } from "@/constants/ssa";
import { useSsaTheme, alertKindLabel, type SsaColors } from "@/lib/ssa-theme";
import { useSanketly } from "@/lib/sanketly-provider";
import { deliveryLabel, sortAlertRecords } from "@/features/alerts/alert-utils";

export default function AlertsScreen() {
  const { alerts } = useSanketly();
  const { colors, text, language } = useSsaTheme();
  const styles = makeStyles(colors);
  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>SSA / ALERT LOG</Text><Text style={styles.title}>{text.alerts}</Text><Text style={styles.subtitle}>{language === "bn" ? "এই ফোনে তৈরি বা পৌঁছানো সতর্কবার্তার রেকর্ড" : language === "hi" ? "इस फ़ोन पर बनाए या पहुँचे अलर्ट का रिकॉर्ड" : "Alerts created or received on this phone"}</Text></View><Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.close}>{text.close}</Text></Pressable></View>
      <FlatList
        data={sortAlertRecords(alerts)}
        keyExtractor={(item) => item.messageId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<SsaButton label={text.newAlert} onPress={() => router.push("/alerts/compose")} />}
        ListEmptyComponent={<SsaCard style={styles.empty}><Text style={styles.emptyTitle}>{text.noAlerts}</Text><Text style={styles.emptyBody}>{text.alertEmptyBody}</Text></SsaCard>}
        renderItem={({ item }) => {
          const meta = ALERT_KIND_LABELS[item.alert.kind];
          return <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/alerts/[messageId]", params: { messageId: item.messageId } })} style={({ pressed }) => [styles.alertRow, pressed && styles.pressed]}>
            <View style={[styles.alertMark, { backgroundColor: meta.color }]} />
            <View style={styles.alertCopy}><View style={styles.rowTop}><Text style={styles.kind}>{alertKindLabel(item.alert.kind, language)}</Text><PriorityChip priority={item.alert.priority} /></View><Text style={styles.alertTitle} numberOfLines={1}>{item.alert.title}</Text><Text style={styles.alertMeta} numberOfLines={1}>{item.alert.village} · {deliveryLabel(item.deliveryState, language)}</Text></View><Text style={styles.chevron}>›</Text>
          </Pressable>;
        }}
      />
    </ScreenContainer>
  );
}

function makeStyles(colors: SsaColors) {
  return StyleSheet.create({
    header: { paddingHorizontal: 18, paddingTop: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    eyebrow: { color: colors.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
    title: { color: colors.foreground, fontSize: 25, fontWeight: "900", marginTop: 5 },
    subtitle: { color: colors.muted, fontSize: 12, marginTop: 5, maxWidth: 260 },
    close: { color: colors.primary, fontSize: 13, fontWeight: "800", paddingTop: 3 },
    list: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28, gap: 11 },
    empty: { marginTop: 4 },
    emptyTitle: { color: colors.foreground, fontSize: 15, fontWeight: "900", marginBottom: 8 },
    emptyBody: { color: colors.muted, fontSize: 12, lineHeight: 19 },
    alertRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 13 },
    alertMark: { width: 7, height: 48, borderRadius: 4, marginRight: 12 },
    alertCopy: { flex: 1, gap: 3 },
    rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    kind: { color: colors.primary, fontSize: 11, fontWeight: "900" },
    alertTitle: { color: colors.foreground, fontSize: 14, fontWeight: "800" },
    alertMeta: { color: colors.faint, fontSize: 11 },
    chevron: { color: colors.faint, fontSize: 25, marginLeft: 8 },
    pressed: { opacity: 0.72 },
  });
}
