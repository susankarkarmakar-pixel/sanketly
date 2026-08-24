import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { SsaButton, SsaCard } from "@/components/ssa/ssa-ui";
import { SSA_COLORS, SSA_COPY } from "@/constants/ssa";
import { useSanketly } from "@/lib/sanketly-provider";
import { SETTINGS_SECTIONS, STORAGE_BOUNDARY } from "@/features/settings/settings-model";

export default function SettingsScreen() {
  const { peerId, openBatterySettings } = useSanketly();
  return <ScreenContainer edges={["top", "left", "right", "bottom"]}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>SSA / SETTINGS</Text><Text style={styles.title}>{SSA_COPY.settings}</Text><Text style={styles.subtitle}>আপনার ডিভাইস ও জরুরি mode-এর নিয়ন্ত্রণ</Text></View><Text onPress={() => router.back()} style={styles.back}>ফিরুন</Text></View>
    <SsaCard><Text style={styles.section}>{SETTINGS_SECTIONS.language}</Text><View style={styles.languageRow}><View><Text style={styles.optionTitle}>বাংলা</Text><Text style={styles.optionMeta}>প্রধান ভাষা · Bengali-first UI</Text></View><Text style={styles.selected}>সক্রিয়</Text></View><View style={styles.languageRow}><View><Text style={styles.optionTitle}>হিন্দি / English</Text><Text style={styles.optionMeta}>পরবর্তী release-এ যোগ হবে</Text></View><Text style={styles.disabled}>শীঘ্রই</Text></View></SsaCard>
    <SsaCard><Text style={styles.section}>{SETTINGS_SECTIONS.emergencyPersistence}</Text><Text style={styles.body}>SSA foreground service, persistent notification, boot recovery এবং relay queue ব্যবহার করে best-effort persistence দেয়। Android force-stop, OEM policy বা permission বন্ধ হলে কোনো app-ই নিরবচ্ছিন্ন থাকার নিশ্চয়তা দিতে পারে না।</Text><SsaButton label="Battery settings খুলুন" variant="secondary" onPress={() => void openBatterySettings()} /></SsaCard>
    <SsaCard><Text style={styles.section}>{SETTINGS_SECTIONS.privacy}</Text><Text style={styles.body}>বার্তার plaintext relay ফোনে থাকে না। Recipient-এর public key দিয়ে encrypted payload তৈরি হয় এবং sender metadata-এর সঙ্গে signature যুক্ত থাকে। এই build-এ analytics বা location sharing স্বয়ংক্রিয় নয়।</Text></SsaCard>
    <SsaCard><Text style={styles.section}>{SETTINGS_SECTIONS.device}</Text><Text style={styles.optionMeta}>Local secure peer ID</Text><Text selectable style={styles.peerId}>{peerId ? `${peerId.slice(0, 22)}…` : "পরিচয় তৈরি হচ্ছে…"}</Text><Text style={styles.note}>Identity SecureStore-এ থাকে। নতুন identity তৈরি হলে পুরনো পরিচয়ের সঙ্গে peer verification আর মিলবে না।</Text><Text style={styles.note}>{STORAGE_BOUNDARY}</Text></SsaCard>
    <SsaButton label="SSA কীভাবে কাজ করে" variant="secondary" onPress={() => router.push("/onboarding")} />
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 13, paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  eyebrow: { color: SSA_COLORS.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: SSA_COLORS.foreground, fontSize: 25, fontWeight: "900", marginTop: 5 },
  subtitle: { color: SSA_COLORS.muted, fontSize: 12, marginTop: 5 },
  back: { color: SSA_COLORS.primary, fontSize: 13, fontWeight: "800" },
  section: { color: SSA_COLORS.foreground, fontSize: 14, fontWeight: "900", marginBottom: 10 },
  languageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderTopColor: SSA_COLORS.border, borderTopWidth: StyleSheet.hairlineWidth },
  optionTitle: { color: SSA_COLORS.foreground, fontSize: 13, fontWeight: "800" },
  optionMeta: { color: SSA_COLORS.faint, fontSize: 11, marginTop: 3 },
  selected: { color: SSA_COLORS.success, fontSize: 11, fontWeight: "800" },
  disabled: { color: SSA_COLORS.faint, fontSize: 10, fontWeight: "800" },
  body: { color: SSA_COLORS.muted, fontSize: 12, lineHeight: 20, marginBottom: 12 },
  peerId: { color: SSA_COLORS.primary, fontSize: 12, marginTop: 8 },
  note: { color: SSA_COLORS.faint, fontSize: 10, lineHeight: 16, marginTop: 9 },
});
