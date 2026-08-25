import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PriorityChip, SsaCard } from "@/components/ssa/ssa-ui";
import { ALERT_KIND_LABELS } from "@/constants/ssa";
import { alertKindLabel, useSsaTheme, type SsaColors, type SsaLanguage } from "@/lib/ssa-theme";
import { useSanketly } from "@/lib/sanketly-provider";

function stateLabel(state: string, language: SsaLanguage): string {
  if (language === "bn") {
    if (state === "delivered") return "পৌঁছানোর প্রমাণ পাওয়া গেছে";
    if (state === "queued") return "কাছের সেতুর অপেক্ষায় কিউতে আছে";
    if (state === "relaying") return "কাছের ফোনের মাধ্যমে এগিয়ে যাচ্ছে";
    if (state === "failed") return "পাঠানোর চেষ্টা ব্যর্থ";
    return "অবস্থা জানা নেই";
  }
  if (language === "hi") {
    if (state === "delivered") return "पहुँचने का प्रमाण मिल गया";
    if (state === "queued") return "नज़दीकी सेतु की प्रतीक्षा में कतार में है";
    if (state === "relaying") return "नज़दीकी फ़ोन से आगे भेजा जा रहा है";
    if (state === "failed") return "भेजने का प्रयास विफल";
    return "स्थिति अज्ञात";
  }
  if (state === "delivered") return "Delivery evidence received";
  if (state === "queued") return "Queued while waiting for a nearby bridge";
  if (state === "relaying") return "Forwarding through a nearby phone";
  if (state === "failed") return "Delivery attempt failed";
  return "Status unknown";
}

export default function AlertDetailScreen() {
  const { messageId } = useLocalSearchParams<{ messageId: string }>();
  const { alerts } = useSanketly();
  const { colors, text, language } = useSsaTheme();
  const styles = makeStyles(colors);
  const record = alerts.find((entry) => entry.messageId === messageId);
  if (!record) return <ScreenContainer><View style={styles.missing}><Text style={styles.title}>{language === "bn" ? "বার্তা পাওয়া যায়নি" : language === "hi" ? "संदेश नहीं मिला" : "Alert not found"}</Text><Text style={styles.body}>{language === "bn" ? "এই ডিভাইসে রেকর্ডটি নেই বা এখনও লোড হচ্ছে।" : language === "hi" ? "यह रिकॉर्ड इस डिवाइस पर नहीं है या अभी लोड हो रहा है।" : "This record is not on this device or is still loading."}</Text></View></ScreenContainer>;
  const meta = ALERT_KIND_LABELS[record.alert.kind];
  return <ScreenContainer edges={["top", "left", "right", "bottom"]}>
    <View style={styles.content}>
      <View style={styles.header}><Text style={styles.eyebrow}>SSA / ALERT DETAIL</Text><Text onPress={() => router.back()} style={styles.back}>{text.back}</Text></View>
      <SsaCard style={[styles.hero, { borderColor: `${meta.color}88` }]}><View style={[styles.kindBadge, { backgroundColor: `${meta.color}22` }]}><Text style={[styles.kind, { color: meta.color }]}>{alertKindLabel(record.alert.kind, language)} · {language === "bn" ? meta.en : language === "hi" ? meta.en : meta.bn}</Text></View><Text style={styles.title}>{record.alert.title}</Text><Text style={styles.village}>{record.alert.village}{record.alert.ward ? ` · ${language === "bn" ? "ওয়ার্ড" : language === "hi" ? "वार्ड" : "Ward"} ${record.alert.ward}` : ""}</Text><View style={styles.statusRow}><PriorityChip priority={record.alert.priority} /><Text style={styles.state}>{stateLabel(record.deliveryState, language)}</Text></View></SsaCard>
      <SsaCard><Text style={styles.section}>{language === "bn" ? "বার্তার বিবরণ" : language === "hi" ? "संदेश का विवरण" : "Alert details"}</Text><Text style={styles.body}>{record.alert.description}</Text></SsaCard>
      <SsaCard><Text style={styles.section}>{language === "bn" ? "সময়সীমা" : language === "hi" ? "समय सीमा" : "Time window"}</Text><Text style={styles.body}>{language === "bn" ? "তৈরি" : language === "hi" ? "बनाया" : "Created"}: {new Date(record.alert.createdAt).toLocaleString(language === "bn" ? "bn-IN" : language === "hi" ? "hi-IN" : "en-IN")}</Text><Text style={styles.body}>{language === "bn" ? "মেয়াদ" : language === "hi" ? "समाप्ति" : "Expires"}: {new Date(record.alert.expiresAt).toLocaleString(language === "bn" ? "bn-IN" : language === "hi" ? "hi-IN" : "en-IN")}</Text><Text style={styles.note}>{language === "bn" ? "মেয়াদ শেষ হলে SSA আর নতুন করে relay করার চেষ্টা করবে না।" : language === "hi" ? "समय सीमा समाप्त होने पर SSA दोबारा relay करने की कोशिश नहीं करेगा।" : "SSA will not attempt a new relay after the alert expires."}</Text></SsaCard>
    </View>
  </ScreenContainer>;
}

function makeStyles(colors: SsaColors) {
  return StyleSheet.create({
    content: { flex: 1, padding: 18, gap: 13 },
    missing: { flex: 1, padding: 20, justifyContent: "center" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    eyebrow: { color: colors.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
    back: { color: colors.primary, fontSize: 13, fontWeight: "800" },
    hero: { gap: 9 },
    kindBadge: { borderRadius: 999, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 5 },
    kind: { fontSize: 11, fontWeight: "900" },
    title: { color: colors.foreground, fontSize: 24, lineHeight: 30, fontWeight: "900" },
    village: { color: colors.muted, fontSize: 13 },
    statusRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
    state: { color: colors.muted, fontSize: 11, flex: 1 },
    section: { color: colors.foreground, fontSize: 14, fontWeight: "900", marginBottom: 9 },
    body: { color: colors.muted, fontSize: 13, lineHeight: 21 },
    note: { color: colors.faint, fontSize: 10, lineHeight: 15, marginTop: 9 },
  });
}
