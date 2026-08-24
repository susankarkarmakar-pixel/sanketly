import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Linking, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { SsaButton, SsaCard } from "@/components/ssa/ssa-ui";
import { checkLocalReadiness, readinessCopy, type LocalReadinessSnapshot } from "@/features/readiness/readiness-utils";
import { requestSsaNotificationPermission } from "@/lib/notifications";
import { useSanketly } from "@/lib/sanketly-provider";
import { useSsaTheme, type SsaColors, type SsaLanguage } from "@/lib/ssa-theme";

const WIZARD_STEP_KEY = "ssa.readiness-wizard-step.v1";
const WIZARD_COMPLETE_KEY = "ssa.readiness-wizard-complete.v1";
const WIZARD_SKIPPED_KEY = "ssa.readiness-wizard-skipped.v1";
const LANGUAGES: Array<{ id: SsaLanguage; label: string }> = [{ id: "bn", label: "বাংলা" }, { id: "en", label: "English" }, { id: "hi", label: "हिन्दी" }];

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

export default function ReadinessWizardScreen() {
  const { startMesh, openBatterySettings, meshStatus, peers, notificationsEnabled } = useSanketly();
  const { colors, language, setLanguage, userMode, setUserMode } = useSsaTheme();
  const styles = makeStyles(colors);
  const [step, setStep] = useState<WizardStep>(0);
  const [checking, setChecking] = useState(false);
  const [snapshot, setSnapshot] = useState<LocalReadinessSnapshot | null>(null);
  const copy = getCopy(language);

  useEffect(() => {
    void AsyncStorage.getItem(WIZARD_STEP_KEY).then((saved) => {
      const parsed = Number(saved);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 5) setStep(parsed as WizardStep);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    void refreshReadiness();
  }, [meshStatus.state, peers.length]);

  async function move(next: WizardStep): Promise<void> {
    setStep(next);
    await AsyncStorage.setItem(WIZARD_STEP_KEY, String(next));
  }

  async function refreshReadiness(): Promise<void> {
    setChecking(true);
    try {
      setSnapshot(await checkLocalReadiness(peers.filter((peer) => peer.verified).length, meshStatus.state === "ready" || meshStatus.state === "starting"));
    } finally {
      setChecking(false);
    }
  }

  async function requestNearby(): Promise<void> {
    if (Platform.OS === "android") {
      const permissions: Array<string | undefined> = [];
      if (Platform.Version >= 31) permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
      if (Platform.Version >= 32 && PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES) permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
      if (Platform.Version >= 29 && Platform.Version <= 31) permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      if (Platform.Version <= 28) permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
      if (permissions.length > 0) await PermissionsAndroid.requestMultiple(permissions.filter(Boolean) as Parameters<typeof PermissionsAndroid.requestMultiple>[0]);
    }
    await refreshReadiness();
  }

  async function requestNotifications(): Promise<void> {
    await requestSsaNotificationPermission(language).catch(() => false);
    await refreshReadiness();
  }

  async function finish(): Promise<void> {
    await AsyncStorage.setItem(WIZARD_COMPLETE_KEY, "1");
    await AsyncStorage.removeItem(WIZARD_SKIPPED_KEY);
    await AsyncStorage.setItem(WIZARD_STEP_KEY, "5");
    await startMesh();
    router.replace("/");
  }

  async function continueLimited(): Promise<void> {
    await AsyncStorage.setItem(WIZARD_SKIPPED_KEY, "1");
    router.replace("/");
  }

  const progress = `${step + 1} / 6`;
  const canContinue = step === 5 ? Boolean(snapshot?.criticalReady) : true;
  const statusRows = useMemo(() => snapshot?.checks ?? [], [snapshot]);

  return <ScreenContainer edges={["top", "left", "right", "bottom"]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.top}><Text style={styles.eyebrow}>SSA / SETUP</Text><Text style={styles.progress}>{progress}</Text></View>
    {step === 0 ? <>
      <Text style={styles.title}>{copy.welcomeTitle}</Text><Text style={styles.tagline}>Jokhon Shob Bondho, Setu Khola Thake.</Text><Text style={styles.intro}>{copy.welcomeBody}</Text>
      <SsaCard style={styles.warning}><Text style={styles.warningTitle}>{copy.boundaryTitle}</Text><Text style={styles.body}>{copy.boundaryBody}</Text></SsaCard>
      <SsaCard><Text style={styles.section}>{copy.languageTitle}</Text>{LANGUAGES.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: language === item.id }} key={item.id} onPress={() => void setLanguage(item.id)} style={[styles.option, language === item.id && styles.optionSelected]}><Text style={styles.optionText}>{item.label}</Text><Text style={styles.optionMark}>{language === item.id ? "✓" : ""}</Text></Pressable>)}</SsaCard>
      <SsaButton label={copy.start} onPress={() => void move(1)} /><Pressable accessibilityRole="button" onPress={() => void continueLimited()}><Text style={styles.secondary}>{copy.limited}</Text></Pressable>
    </> : null}
    {step === 1 ? <>
      <Text style={styles.title}>{copy.roleTitle}</Text><Text style={styles.intro}>{copy.roleBody}</Text>
      <SsaCard><RoleOption title={copy.resident} body={copy.residentBody} selected={userMode === "resident"} onPress={() => void setUserMode("resident")} colors={colors} /><RoleOption title={copy.volunteer} body={copy.volunteerBody} selected={userMode === "volunteer"} onPress={() => void setUserMode("volunteer")} colors={colors} /></SsaCard>
      <SsaButton label={copy.continue} onPress={() => void move(2)} /><Pressable accessibilityRole="button" onPress={() => void move(0)}><Text style={styles.secondary}>{copy.back}</Text></Pressable>
    </> : null}
    {step === 2 ? <>
      <Text style={styles.title}>{copy.nearbyTitle}</Text><Text style={styles.intro}>{copy.nearbyBody}</Text><SsaCard><Text style={styles.section}>{copy.whatHappens}</Text><Text style={styles.body}>{copy.nearbyPoints}</Text></SsaCard>
      {snapshot?.checks.find((check) => check.id === "nearby") ? <StatusCard label={copy.nearbyStatus} status={snapshot.checks.find((check) => check.id === "nearby")!} language={language} colors={colors} /> : null}
      <SsaButton label={copy.allowNearby} onPress={() => void requestNearby()} disabled={checking} /><Pressable accessibilityRole="button" onPress={() => void move(3)}><Text style={styles.secondary}>{copy.limited}</Text></Pressable>
    </> : null}
    {step === 3 ? <>
      <Text style={styles.title}>{copy.notificationTitle}</Text><Text style={styles.intro}>{copy.notificationBody}</Text><SsaCard><Text style={styles.section}>{copy.privateTitle}</Text><Text style={styles.body}>{copy.privateBody}</Text></SsaCard>
      {snapshot?.checks.find((check) => check.id === "notifications") ? <StatusCard label={copy.notificationStatus} status={snapshot.checks.find((check) => check.id === "notifications")!} language={language} colors={colors} /> : null}
      <SsaButton label={copy.allowNotifications} onPress={() => void requestNotifications()} disabled={checking} /><Pressable accessibilityRole="button" onPress={() => void move(4)}><Text style={styles.secondary}>{copy.continueWithout}</Text></Pressable>
    </> : null}
    {step === 4 ? <>
      <Text style={styles.title}>{copy.backgroundTitle}</Text><Text style={styles.intro}>{copy.backgroundBody}</Text><SsaCard style={styles.warning}><Text style={styles.warningTitle}>{copy.reliabilityTitle}</Text><Text style={styles.body}>{copy.reliabilityBody}</Text></SsaCard><SsaButton label={copy.batterySettings} variant="secondary" onPress={() => void openBatterySettings()} /><SsaButton label={copy.continue} onPress={() => void move(5)} /><Pressable accessibilityRole="button" onPress={() => void move(5)}><Text style={styles.secondary}>{copy.skipBattery}</Text></Pressable>
    </> : null}
    {step === 5 ? <>
      <Text style={styles.title}>{copy.checkTitle}</Text><Text style={styles.intro}>{copy.checkBody}</Text><SsaCard>{statusRows.map((check) => <StatusCard key={check.id} label={check.title} status={check} language={language} colors={colors} />)}</SsaCard>{snapshot && !snapshot.criticalReady ? <SsaCard style={styles.errorCard}><Text style={styles.warningTitle}>{copy.fixTitle}</Text><Text style={styles.body}>{copy.fixBody}</Text><SsaButton label={copy.openSettings} variant="secondary" onPress={() => void Linking.openSettings()} /></SsaCard> : null}<SsaButton label={snapshot?.criticalReady ? copy.startSearch : copy.retry} onPress={() => void (snapshot?.criticalReady ? finish() : refreshReadiness())} disabled={checking || !canContinue} /><Pressable accessibilityRole="button" onPress={() => void continueLimited()}><Text style={styles.secondary}>{copy.dashboard}</Text></Pressable></> : null}
    <View style={styles.stepNav}>{step > 0 ? <Pressable accessibilityRole="button" onPress={() => void move((step - 1) as WizardStep)}><Text style={styles.secondary}>{copy.back}</Text></Pressable> : <View />}{step < 5 ? <Text style={styles.hint}>{copy.noDataLoss}</Text> : null}</View>
  </ScrollView></ScreenContainer>;
}

function RoleOption({ title, body, selected, onPress, colors }: { title: string; body: string; selected: boolean; onPress: () => void; colors: SsaColors }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[stylesFor(colors).role, selected && stylesFor(colors).roleSelected]}><View style={stylesFor(colors).roleCopy}><Text style={stylesFor(colors).roleTitle}>{title}</Text><Text style={stylesFor(colors).roleBody}>{body}</Text></View><Text style={stylesFor(colors).mark}>{selected ? "✓" : ""}</Text></Pressable>;
}

function StatusCard({ label, status, language, colors }: { label: string; status: { status: "checking" | "ready" | "needs-attention" | "blocked" | "not-required"; detail: string }; language: SsaLanguage; colors: SsaColors }) {
  const color = status.status === "ready" ? colors.success : status.status === "blocked" ? colors.danger : colors.warning;
  return <View style={[stylesFor(colors).status, { borderLeftColor: color }]}><View style={[stylesFor(colors).statusDot, { backgroundColor: color }]} /><View style={stylesFor(colors).statusCopy}><Text style={stylesFor(colors).statusTitle}>{label}</Text><Text style={stylesFor(colors).statusBody}>{status.detail}</Text></View><Text style={[stylesFor(colors).statusLabel, { color }]}>{readinessCopy(status.status, language)}</Text></View>;
}

function getCopy(language: SsaLanguage) {
  if (language === "bn") return { welcomeTitle: "SSA প্রস্তুত করুন", welcomeBody: "কাছের ফোনের সাহায্যে জরুরি বার্তা পাঠানোর আগে এই ছোট setup শেষ করুন।", boundaryTitle: "মনে রাখবেন", boundaryBody: "SSA best-effort যোগাযোগ। জীবনরক্ষাকারী সিদ্ধান্তে ফোন, স্থানীয় প্রশাসন ও অন্য পথও ব্যবহার করুন।", languageTitle: "ভাষা বেছে নিন", start: "শুরু করি", roleTitle: "আপনার ব্যবহার", roleBody: "এই ফোনটি বাসিন্দা বা স্বেচ্ছাসেবক হিসেবে ব্যবহার করবেন?", resident: "বাসিন্দা", residentBody: "সহজ alert পাঠানো ও পাওয়া", volunteer: "স্বেচ্ছাসেবক", volunteerBody: "peer approval, relay ও status দেখা", continue: "এগিয়ে যান", back: "পিছনে", nearbyTitle: "কাছের ফোন খুঁজতে অনুমতি", nearbyBody: "SSA Bluetooth, Nearby ও Wi‑Fi device access ব্যবহার করে কাছের SSA ফোন খোঁজে।", whatHappens: "কী হবে", nearbyPoints: "কাছের SSA ফোন খোঁজা হবে। Message encrypted থাকবে। Internet সবসময় দরকার নেই।", nearbyStatus: "Nearby permission", allowNearby: "Nearby permission দিন", limited: "এখন নয় — limited mode", notificationTitle: "জরুরি alert-এর খবর", notificationBody: "অন্য ফোন থেকে alert এলে notification দেখাতে এই অনুমতি দরকার।", privateTitle: "Privacy", privateBody: "Lock screen-এ alert-এর পুরো লেখা দেখানো হবে না।", notificationStatus: "Notifications", allowNotifications: "Notification permission দিন", continueWithout: "পরে — অ্যাপ চলবে", backgroundTitle: "ব্যাকগ্রাউন্ডে কাজ", backgroundBody: "Foreground service nearby search চালু রাখার চেষ্টা করে। Battery saver বা OEM policy কাজ থামাতে পারে।", reliabilityTitle: "Best-effort recovery", reliabilityBody: "Battery settings review করুন। SSA force-stop বা OEM policy অতিক্রম করার নিশ্চয়তা দেয় না।", batterySettings: "Battery settings দেখুন", skipBattery: "এখন বাদ দিন — limitation বুঝেছি", checkTitle: "SSA প্রস্তুতি পরীক্ষা", checkBody: "প্রস্তুত মানে ফোন search করতে পারবে; কোনো alert delivered হয়েছে এমন নয়।", fixTitle: "আরও setup দরকার", fixBody: "Critical permission বা Nearby module প্রস্তুত নয়। Settings খুলে আবার পরীক্ষা করুন।", openSettings: "Android Settings খুলুন", retry: "আবার পরীক্ষা করুন", startSearch: "Nearby search শুরু করুন", dashboard: "Dashboard-এ যান", noDataLoss: "পরে ফিরলেও local data থাকবে" };
  if (language === "hi") return { welcomeTitle: "SSA तैयार करें", welcomeBody: "नज़दीकी फ़ोन से emergency संदेश भेजने से पहले यह छोटा setup पूरा करें।", boundaryTitle: "ध्यान रखें", boundaryBody: "SSA best-effort communication है। जीवन बचाने वाले निर्णयों में फ़ोन, स्थानीय प्रशासन और दूसरे रास्ते भी उपयोग करें।", languageTitle: "भाषा चुनें", start: "शुरू करें", roleTitle: "आपका उपयोग", roleBody: "यह फ़ोन निवासी या स्वयंसेवक के रूप में उपयोग होगा?", resident: "निवासी", residentBody: "सरल alert भेजना और पाना", volunteer: "स्वयंसेवक", volunteerBody: "peer approval, relay और status देखना", continue: "आगे बढ़ें", back: "पीछे", nearbyTitle: "नज़दीकी फ़ोन खोजने की अनुमति", nearbyBody: "SSA Bluetooth, Nearby और Wi‑Fi device access से पास के SSA फ़ोन खोजता है।", whatHappens: "क्या होगा", nearbyPoints: "नज़दीकी SSA फ़ोन खोजे जाएँगे। Message encrypted रहेगा। Internet हमेशा ज़रूरी नहीं है।", nearbyStatus: "Nearby permission", allowNearby: "Nearby permission दें", limited: "अभी नहीं — limited mode", notificationTitle: "Emergency alert की सूचना", notificationBody: "दूसरे फ़ोन से alert आने पर notification दिखाने के लिए यह अनुमति चाहिए।", privateTitle: "Privacy", privateBody: "Lock screen पर alert का पूरा text नहीं दिखेगा।", notificationStatus: "Notifications", allowNotifications: "Notification permission दें", continueWithout: "बाद में — ऐप चलेगा", backgroundTitle: "Background में काम", backgroundBody: "Foreground service nearby search चलाने की कोशिश करता है। Battery saver या OEM policy काम रोक सकती है।", reliabilityTitle: "Best-effort recovery", reliabilityBody: "Battery settings review करें। SSA force-stop या OEM policy को पार करने की गारंटी नहीं देता।", batterySettings: "Battery settings देखें", skipBattery: "अभी छोड़ें — limitation समझी", checkTitle: "SSA readiness जाँच", checkBody: "तैयार का अर्थ है फ़ोन search कर सकता है; इसका अर्थ alert delivered नहीं है।", fixTitle: "और setup चाहिए", fixBody: "Critical permission या Nearby module तैयार नहीं है। Settings खोलकर फिर जाँचें।", openSettings: "Android Settings खोलें", retry: "फिर जाँचें", startSearch: "Nearby search शुरू करें", dashboard: "Dashboard पर जाएँ", noDataLoss: "बाद में लौटने पर local data रहेगा" };
  return { welcomeTitle: "Prepare SSA", welcomeBody: "Complete this short setup before sending emergency messages through nearby phones.", boundaryTitle: "Remember", boundaryBody: "SSA is best-effort communication. For life-saving decisions, also use phone calls, local administration, and every other available path.", languageTitle: "Choose language", start: "Get started", roleTitle: "Your use", roleBody: "Will this phone be used as a resident or volunteer device?", resident: "Resident", residentBody: "Simple alert sending and receiving", volunteer: "Volunteer", volunteerBody: "Peer approval, relay, and status tools", continue: "Continue", back: "Back", nearbyTitle: "Permission to find nearby phones", nearbyBody: "SSA uses Bluetooth, Nearby, and Wi-Fi device access to find nearby SSA phones.", whatHappens: "What happens", nearbyPoints: "Nearby SSA phones are searched. Messages remain encrypted. Internet is not always required.", nearbyStatus: "Nearby permission", allowNearby: "Allow Nearby permission", limited: "Not now — limited mode", notificationTitle: "Receive emergency alert notices", notificationBody: "This permission lets SSA show a notification when another phone delivers an alert.", privateTitle: "Privacy", privateBody: "The full alert text will not be shown on the lock screen.", notificationStatus: "Notifications", allowNotifications: "Allow notification permission", continueWithout: "Later — continue", backgroundTitle: "Background operation", backgroundBody: "The foreground service tries to keep nearby search active. Battery saver or OEM policy may stop background work.", reliabilityTitle: "Best-effort recovery", reliabilityBody: "Review battery settings. SSA cannot guarantee recovery after force-stop or OEM restrictions.", batterySettings: "Review battery settings", skipBattery: "Skip — I understand the limitation", checkTitle: "Check SSA readiness", checkBody: "Ready means this phone can search; it does not mean an alert has been delivered.", fixTitle: "More setup is needed", fixBody: "A critical permission or Nearby module is not ready. Open Settings and check again.", openSettings: "Open Android Settings", retry: "Check again", startSearch: "Start Nearby search", dashboard: "Go to dashboard", noDataLoss: "Local data remains if you return later" };
}

function stylesFor(colors: SsaColors) { return StyleSheet.create({ role: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginTop: 9 }, roleSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceRaised }, roleCopy: { flex: 1 }, roleTitle: { color: colors.foreground, fontSize: 14, fontWeight: "900" }, roleBody: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 }, mark: { color: colors.success, fontSize: 18, fontWeight: "900" }, status: { flexDirection: "row", alignItems: "center", gap: 9, borderLeftWidth: 4, paddingVertical: 10, paddingLeft: 10, marginTop: 8, backgroundColor: colors.surface }, statusDot: { width: 9, height: 9, borderRadius: 5 }, statusCopy: { flex: 1 }, statusTitle: { color: colors.foreground, fontSize: 12, fontWeight: "800" }, statusBody: { color: colors.faint, fontSize: 10, lineHeight: 15, marginTop: 2 }, statusLabel: { fontSize: 10, fontWeight: "900" } }); }

function makeStyles(colors: SsaColors) { return StyleSheet.create({ content: { padding: 18, gap: 13, paddingBottom: 30 }, top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, eyebrow: { color: colors.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 }, progress: { color: colors.primary, fontSize: 11, fontWeight: "900" }, title: { color: colors.foreground, fontSize: 26, fontWeight: "900", marginTop: 8 }, tagline: { color: colors.primary, fontSize: 12, fontWeight: "800" }, intro: { color: colors.muted, fontSize: 13, lineHeight: 21 }, warning: { borderColor: colors.warning, backgroundColor: colors.surfaceRaised }, warningTitle: { color: colors.warning, fontSize: 14, fontWeight: "900", marginBottom: 5 }, errorCard: { borderColor: colors.danger, backgroundColor: colors.criticalSurface }, body: { color: colors.muted, fontSize: 12, lineHeight: 19 }, section: { color: colors.foreground, fontSize: 14, fontWeight: "900", marginBottom: 5 }, option: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, borderRadius: 10 }, optionSelected: { backgroundColor: colors.surfaceRaised }, optionText: { color: colors.foreground, fontSize: 14, fontWeight: "800" }, optionMark: { color: colors.success, fontSize: 17, fontWeight: "900" }, secondary: { color: colors.primary, fontSize: 12, fontWeight: "800", textAlign: "center", paddingVertical: 5 }, hint: { color: colors.faint, fontSize: 10, textAlign: "center" }, stepNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 } }); }
