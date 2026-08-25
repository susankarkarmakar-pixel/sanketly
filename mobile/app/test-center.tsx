import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { createAnnouncePacket, decodePacket, encodePacket } from "@sanketly/protocol";
import { generateMeshIdentity, initMeshCrypto } from "@sanketly/mesh-crypto";
import { ScreenContainer } from "@/components/screen-container";
import { SsaButton, SsaCard } from "@/components/ssa/ssa-ui";
import { checkLocalReadiness, readinessCopy, type ReadinessCheck } from "@/features/readiness/readiness-utils";
import { useSanketly } from "@/lib/sanketly-provider";
import { useSsaTheme, type SsaColors, type SsaLanguage } from "@/lib/ssa-theme";
import { loadMeshIdentity } from "@/lib/storage";
import { notifyTestAlert } from "@/lib/notifications";

type TestId = "crypto" | "framing" | "identity" | "readiness";
type TestState = "idle" | "running" | "passed" | "failed";

interface TestResult {
  state: TestState;
  detail?: string;
}

const INITIAL_RESULTS: Record<TestId, TestResult> = {
  crypto: { state: "idle" },
  framing: { state: "idle" },
  identity: { state: "idle" },
  readiness: { state: "idle" },
};

export default function TestCenterScreen() {
  const { peers, meshStatus, notificationsEnabled } = useSanketly();
  const { colors, language } = useSsaTheme();
  const styles = makeStyles(colors);
  const [results, setResults] = useState(INITIAL_RESULTS);
  const [readiness, setReadiness] = useState<ReadinessCheck[]>([]);
  const [notificationState, setNotificationState] = useState<TestState>("idle");

  const copy = getCopy(language);
  const statusLabel = (state: TestState) => state === "passed" ? copy.passed : state === "failed" ? copy.failed : state === "running" ? copy.running : copy.notRun;

  async function runLocalTests(): Promise<void> {
    setResults({ crypto: { state: "running" }, framing: { state: "running" }, identity: { state: "running" }, readiness: { state: "running" } });
    const next = { ...INITIAL_RESULTS };
    try {
      await initMeshCrypto();
      const generated = await generateMeshIdentity();
      if (!generated.peerId) throw new Error("Identity peer ID is empty");
      next.crypto = { state: "passed", detail: "libsodium initialized and generated identity keys" };
    } catch (error) {
      next.crypto = { state: "failed", detail: error instanceof Error ? error.message : "Crypto self-test failed" };
    }
    try {
      const packet = createAnnouncePacket({ packetId: "ssa-test-packet", senderId: "ssa-test-peer", payload: "test" });
      const decoded = decodePacket(encodePacket(packet));
      if (decoded.packetId !== packet.packetId || decoded.type !== "announce") throw new Error("Packet round-trip mismatch");
      next.framing = { state: "passed", detail: "SSA frame encode/decode round-trip passed" };
    } catch (error) {
      next.framing = { state: "failed", detail: error instanceof Error ? error.message : "Frame self-test failed" };
    }
    try {
      const stored = await loadMeshIdentity();
      if (!stored.peerId || !stored.signingPublicKey) throw new Error("Stored identity is incomplete");
      next.identity = { state: "passed", detail: "Secure local identity is readable" };
    } catch (error) {
      next.identity = { state: "failed", detail: error instanceof Error ? error.message : "Identity storage self-test failed" };
    }
    try {
      const snapshot = await checkLocalReadiness(peers.filter((peer) => peer.verified).length, meshStatus.state === "ready" || meshStatus.state === "starting");
      setReadiness(snapshot.checks);
      next.readiness = { state: "passed", detail: `${snapshot.checks.filter((check) => check.status === "ready").length}/${snapshot.checks.length} readiness checks currently ready` };
    } catch (error) {
      next.readiness = { state: "failed", detail: error instanceof Error ? error.message : "Readiness self-test failed" };
    }
    setResults(next);
  }

  async function runNotificationTest(): Promise<void> {
    if (!notificationsEnabled) {
      Alert.alert(copy.notificationTitle, copy.notificationDisabled);
      return;
    }
    setNotificationState("running");
    try {
      const scheduled = await notifyTestAlert(language);
      setNotificationState(scheduled ? "passed" : "failed");
    } catch {
      setNotificationState("failed");
    }
  }

  return <ScreenContainer edges={["top", "left", "right", "bottom"]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>SSA / TEST CENTER</Text><Text style={styles.title}>{copy.title}</Text><Text style={styles.subtitle}>{copy.subtitle}</Text></View><Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>{copy.back}</Text></Pressable></View>
    <SsaCard style={styles.warning}><Text style={styles.warningTitle}>{copy.warningTitle}</Text><Text style={styles.body}>{copy.warningBody}</Text></SsaCard>
    <SsaCard><Text style={styles.section}>{copy.localTitle}</Text><Text style={styles.body}>{copy.localBody}</Text><SsaButton label={copy.runAll} onPress={() => void runLocalTests()} />{(["crypto", "framing", "identity", "readiness"] as TestId[]).map((id) => <TestRow key={id} label={copy.tests[id]} result={results[id]} statusLabel={statusLabel} colors={colors} />)}</SsaCard>
    <SsaCard><Text style={styles.section}>{copy.notificationTitle}</Text><Text style={styles.body}>{copy.notificationBody}</Text><SsaButton label={copy.sendTestNotification} variant="secondary" onPress={() => void runNotificationTest()} /><TestRow label={copy.tests.notification} result={{ state: notificationState }} statusLabel={statusLabel} colors={colors} /></SsaCard>
    {readiness.length > 0 ? <SsaCard><Text style={styles.section}>{copy.readinessTitle}</Text>{readiness.map((check) => <View key={check.id} style={styles.readinessRow}><View style={[styles.dot, { backgroundColor: check.status === "ready" ? colors.success : check.status === "blocked" ? colors.danger : colors.warning }]} /><View style={styles.readinessCopy}><Text style={styles.rowTitle}>{check.title}</Text><Text style={styles.rowBody}>{check.detail}</Text></View><Text style={styles.rowStatus}>{readinessCopy(check.status, language)}</Text></View>)}</SsaCard> : null}
    <SsaCard><Text style={styles.section}>{copy.manualTitle}</Text><Text style={styles.body}>{copy.manualBody}</Text><ManualRow label={copy.manual.wizard} onPress={() => router.push("/readiness")} colors={colors} /><ManualRow label={copy.manual.network} onPress={() => router.push("/network")} colors={colors} /><ManualRow label={copy.manual.sos} onPress={() => router.push({ pathname: "/alerts/compose", params: { kind: "sos" } })} colors={colors} /><ManualRow label={copy.manual.alert} onPress={() => router.push("/alerts/compose")} colors={colors} /><ManualRow label={copy.manual.info} onPress={() => router.push("/onboarding")} colors={colors} /></SsaCard>
    <Text style={styles.footer}>{copy.footer}</Text>
  </ScrollView></ScreenContainer>;
}

function TestRow({ label, result, statusLabel, colors }: { label: string; result: TestResult; statusLabel: (state: TestState) => string; colors: SsaColors }) {
  const statusColor = result.state === "passed" ? colors.success : result.state === "failed" ? colors.danger : result.state === "running" ? colors.warning : colors.faint;
  return <View style={rowStyles.row}><View style={[rowStyles.dot, { backgroundColor: statusColor }]} /><View style={rowStyles.copy}><Text style={[rowStyles.title, { color: colors.foreground }]}>{label}</Text>{result.detail ? <Text style={[rowStyles.detail, { color: colors.faint }]}>{result.detail}</Text> : null}</View><Text style={[rowStyles.status, { color: statusColor }]}>{statusLabel(result.state)}</Text></View>;
}

function ManualRow({ label, onPress, colors }: { label: string; onPress: () => void; colors: SsaColors }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [rowStyles.manual, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}><Text style={[rowStyles.manualText, { color: colors.foreground }]}>{label}</Text><Text style={[rowStyles.arrow, { color: colors.primary }]}>›</Text></Pressable>;
}

function getCopy(language: SsaLanguage) {
  if (language === "bn") return { title: "ফিচার পরীক্ষা", subtitle: "একটি করে SSA feature পরীক্ষা করুন", back: "ফিরুন", warningTitle: "শুধু পরীক্ষা", warningBody: "এখানকার notification test আসল জরুরি alert নয়। Mesh test-এর জন্য কাছের Android ফোন ব্যবহার করুন।", localTitle: "লোকাল self-test", localBody: "Crypto, packet framing, identity storage ও readiness check পরীক্ষা করুন।", runAll: "সব লোকাল পরীক্ষা চালান", notificationTitle: "Notification পরীক্ষা", notificationBody: "এই ফোনে test notification পাঠান। এটি কোনো mesh alert তৈরি বা পাঠায় না।", sendTestNotification: "Test notification পাঠান", notificationDisabled: "Settings-এ emergency notifications চালু করুন।", readinessTitle: "বর্তমান readiness", manualTitle: "ম্যানুয়াল feature পরীক্ষা", manualBody: "যে flow পরীক্ষা করতে চান সেটি খুলুন।", passed: "পাস", failed: "ব্যর্থ", running: "চলছে…", notRun: "হয়নি", tests: { crypto: "Libsodium crypto", framing: "SSA packet framing", identity: "Secure identity storage", readiness: "Local readiness checks", notification: "Local notification" }, manual: { wizard: "First-run readiness wizard খুলুন", network: "Nearby mesh ও peer approval পরীক্ষা করুন", sos: "SOS composer পরীক্ষা করুন", alert: "Structured alert composer পরীক্ষা করুন", info: "SSA কীভাবে কাজ করে দেখুন" }, footer: "এটি development/pilot test center। ফলাফল দিয়ে real emergency delivery প্রমাণ হয় না।" };
  if (language === "hi") return { title: "फ़ीचर परीक्षण", subtitle: "SSA फ़ीचर एक-एक करके जाँचें", back: "वापस", warningTitle: "केवल परीक्षण", warningBody: "यह notification test वास्तविक emergency alert नहीं है। Mesh test के लिए पास के Android फ़ोन का उपयोग करें।", localTitle: "लोकल self-test", localBody: "Crypto, packet framing, identity storage और readiness check जाँचें।", runAll: "सभी लोकल परीक्षण चलाएँ", notificationTitle: "Notification परीक्षण", notificationBody: "इस फ़ोन पर test notification भेजें। यह mesh alert नहीं बनाता या भेजता।", sendTestNotification: "Test notification भेजें", notificationDisabled: "Settings में emergency notifications चालू करें।", readinessTitle: "वर्तमान readiness", manualTitle: "मैन्युअल फ़ीचर परीक्षण", manualBody: "जिस flow को जाँचना है, उसे खोलें।", passed: "पास", failed: "विफल", running: "चल रहा…", notRun: "नहीं हुआ", tests: { crypto: "Libsodium crypto", framing: "SSA packet framing", identity: "Secure identity storage", readiness: "Local readiness checks", notification: "Local notification" }, manual: { wizard: "First-run readiness wizard खोलें", network: "Nearby mesh और peer approval जाँचें", sos: "SOS composer जाँचें", alert: "Structured alert composer जाँचें", info: "SSA कैसे काम करता है देखें" }, footer: "यह development/pilot test center है। इससे वास्तविक emergency delivery सिद्ध नहीं होती।" };
  return { title: "Feature test center", subtitle: "Test SSA features one at a time", back: "Back", warningTitle: "Testing only", warningBody: "The notification test is not a real emergency alert. Use nearby Android phones for mesh testing.", localTitle: "Local self-tests", localBody: "Check crypto, packet framing, identity storage, and readiness.", runAll: "Run local tests", notificationTitle: "Notification test", notificationBody: "Send a test notification to this phone. It does not create or transmit a mesh alert.", sendTestNotification: "Send test notification", notificationDisabled: "Enable emergency notifications in Settings first.", readinessTitle: "Current readiness", manualTitle: "Manual feature tests", manualBody: "Open the flow you want to test.", passed: "Passed", failed: "Failed", running: "Running…", notRun: "Not run", tests: { crypto: "Libsodium crypto", framing: "SSA packet framing", identity: "Secure identity storage", readiness: "Local readiness checks", notification: "Local notification" }, manual: { wizard: "Open first-run readiness wizard", network: "Test Nearby mesh and peer approval", sos: "Test SOS composer", alert: "Test structured alert composer", info: "Read how SSA works" }, footer: "This is a development/pilot Test Center. It does not prove real emergency delivery." };
}

const rowStyles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#334155" }, dot: { width: 9, height: 9, borderRadius: 5 }, copy: { flex: 1 }, title: { fontSize: 13, fontWeight: "800" }, detail: { fontSize: 10, lineHeight: 15, marginTop: 2 }, status: { fontSize: 11, fontWeight: "900" }, manual: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 12, marginTop: 8 }, manualText: { fontSize: 12, fontWeight: "700" }, arrow: { fontSize: 24, lineHeight: 24 } });

function makeStyles(colors: SsaColors) { return StyleSheet.create({ content: { padding: 18, gap: 13, paddingBottom: 30 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, eyebrow: { color: colors.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 }, title: { color: colors.foreground, fontSize: 25, fontWeight: "900", marginTop: 5 }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 4, maxWidth: 230 }, back: { color: colors.primary, fontSize: 13, fontWeight: "800" }, warning: { borderColor: colors.warning, backgroundColor: colors.surfaceRaised }, warningTitle: { color: colors.warning, fontSize: 14, fontWeight: "900", marginBottom: 5 }, section: { color: colors.foreground, fontSize: 15, fontWeight: "900", marginBottom: 6 }, body: { color: colors.muted, fontSize: 12, lineHeight: 19, marginBottom: 11 }, readinessRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, dot: { width: 9, height: 9, borderRadius: 5 }, readinessCopy: { flex: 1 }, rowTitle: { color: colors.foreground, fontSize: 12, fontWeight: "800" }, rowBody: { color: colors.faint, fontSize: 10, lineHeight: 15, marginTop: 2 }, rowStatus: { color: colors.muted, fontSize: 10, fontWeight: "800" }, footer: { color: colors.faint, fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 2 } }); }
