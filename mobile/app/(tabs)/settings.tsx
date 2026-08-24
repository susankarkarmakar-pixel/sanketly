import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { SsaButton, SsaCard } from "@/components/ssa/ssa-ui";
import { useSsaTheme, type SsaColors, type SsaLanguage, type SsaThemeMode } from "@/lib/ssa-theme";
import { useSanketly } from "@/lib/sanketly-provider";
import { STORAGE_BOUNDARY } from "@/features/settings/settings-model";

const LANGUAGES: Array<{ id: SsaLanguage; labelKey: "bengali" | "english" | "hindi" }> = [
  { id: "bn", labelKey: "bengali" },
  { id: "en", labelKey: "english" },
  { id: "hi", labelKey: "hindi" },
];

const THEMES: Array<{ id: SsaThemeMode; labelKey: "light" | "dark" | "system" }> = [
  { id: "light", labelKey: "light" },
  { id: "dark", labelKey: "dark" },
  { id: "system", labelKey: "system" },
];

export default function SettingsScreen() {
  const { peerId, openBatterySettings, notificationsEnabled, setNotificationsEnabled } = useSanketly();
  const { colors, language, text, setLanguage, themeMode, setThemeMode, userMode, setUserMode } = useSsaTheme();
  const styles = makeStyles(colors);

  return <ScreenContainer edges={["top", "left", "right", "bottom"]}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>SSA / SETTINGS</Text><Text style={styles.title}>{text.settings}</Text><Text style={styles.subtitle}>{language === "bn" ? "আপনার ডিভাইস ও জরুরি মোডের নিয়ন্ত্রণ" : language === "hi" ? "अपने डिवाइस और आपातकालीन मोड का नियंत्रण" : "Control your device and emergency mode"}</Text></View><Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>{text.back}</Text></Pressable></View>

    <SsaCard><Text style={styles.section}>{text.language}</Text><Text style={styles.helper}>{text.languageMeta}</Text>{LANGUAGES.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: language === item.id }} key={item.id} onPress={() => void setLanguage(item.id)} style={[styles.optionRow, language === item.id && styles.selectedRow]}><View><Text style={styles.optionTitle}>{text[item.labelKey]}</Text><Text style={styles.optionMeta}>{item.id === "bn" ? "বাংলা" : item.id === "hi" ? "हिन्दी" : "English"}</Text></View><Text style={language === item.id ? styles.selected : styles.unselected}>{language === item.id ? text.active : ""}</Text></Pressable>)}</SsaCard>

    <SsaCard><Text style={styles.section}>{text.theme}</Text>{THEMES.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: themeMode === item.id }} key={item.id} onPress={() => void setThemeMode(item.id)} style={[styles.optionRow, themeMode === item.id && styles.selectedRow]}><Text style={styles.optionTitle}>{text[item.labelKey]}</Text><Text style={themeMode === item.id ? styles.selected : styles.unselected}>{themeMode === item.id ? text.active : ""}</Text></Pressable>)}</SsaCard>

    <SsaCard><Text style={styles.section}>{language === "bn" ? "জরুরি বিজ্ঞপ্তি" : language === "hi" ? "आपातकालीन सूचनाएँ" : "Emergency notifications"}</Text><Text style={styles.helper}>{language === "bn" ? "নতুন যাচাই করা জরুরি বার্তা এলে শব্দ ও কম্পনসহ স্থানীয় বিজ্ঞপ্তি" : language === "hi" ? "नया सत्यापित आपातकालीन संदेश आने पर ध्वनि और कंपन के साथ स्थानीय सूचना" : "Local sound and vibration when a verified emergency message arrives"}</Text><Pressable accessibilityRole="switch" accessibilityState={{ checked: notificationsEnabled }} onPress={() => void setNotificationsEnabled(!notificationsEnabled)} style={[styles.optionRow, notificationsEnabled && styles.selectedRow]}><View><Text style={styles.optionTitle}>{language === "bn" ? "জরুরি বিজ্ঞপ্তি চালু" : language === "hi" ? "आपात सूचना चालू" : "Emergency alerts enabled"}</Text><Text style={styles.optionMeta}>{notificationsEnabled ? (language === "bn" ? "চালু" : language === "hi" ? "चालू" : "On") : (language === "bn" ? "বন্ধ" : language === "hi" ? "बंद" : "Off")}</Text></View><Text style={notificationsEnabled ? styles.selected : styles.unselected}>{notificationsEnabled ? text.active : ""}</Text></Pressable></SsaCard>

    <SsaCard><Text style={styles.section}>{language === "bn" ? "ব্যবহারের ধরন" : language === "hi" ? "उपयोग का प्रकार" : "User mode"}</Text><Text style={styles.helper}>{language === "bn" ? "সাধারণ ব্যবহারকারী বা পাইলট স্বেচ্ছাসেবকের জন্য আলাদা নিয়ন্ত্রণ" : language === "hi" ? "निवासी और पायलट स्वयंसेवक के लिए अलग नियंत्रण" : "Separate controls for residents and pilot volunteers"}</Text><Pressable accessibilityRole="radio" accessibilityState={{ selected: userMode === "resident" }} onPress={() => void setUserMode("resident")} style={[styles.optionRow, userMode === "resident" && styles.selectedRow]}><View><Text style={styles.optionTitle}>{language === "bn" ? "বাসিন্দা মোড" : language === "hi" ? "निवासी मोड" : "Resident mode"}</Text><Text style={styles.optionMeta}>{language === "bn" ? "সহজ alert পাঠানো ও দেখা" : language === "hi" ? "सरल alert भेजना और देखना" : "Simple alert sending and viewing"}</Text></View><Text style={userMode === "resident" ? styles.selected : styles.unselected}>{userMode === "resident" ? text.active : ""}</Text></Pressable><Pressable accessibilityRole="radio" accessibilityState={{ selected: userMode === "volunteer" }} onPress={() => void setUserMode("volunteer")} style={[styles.optionRow, userMode === "volunteer" && styles.selectedRow]}><View><Text style={styles.optionTitle}>{language === "bn" ? "স্বেচ্ছাসেবক মোড" : language === "hi" ? "स्वयंसेवक मोड" : "Volunteer mode"}</Text><Text style={styles.optionMeta}>{language === "bn" ? "peer, relay ও নিরাপত্তা তথ্য" : language === "hi" ? "peer, relay और सुरक्षा विवरण" : "Peer, relay, and security details"}</Text></View><Text style={userMode === "volunteer" ? styles.selected : styles.unselected}>{userMode === "volunteer" ? text.active : ""}</Text></Pressable></SsaCard>
    <SsaCard><Text style={styles.section}>{text.emergencyPersistence}</Text><Text style={styles.body}>{language === "bn" ? "SSA foreground service, persistent notification, boot recovery এবং relay queue ব্যবহার করে best-effort persistence দেয়। Android force-stop, OEM policy বা permission বন্ধ হলে কোনো app-ই নিরবচ্ছিন্ন থাকার নিশ্চয়তা দিতে পারে না।" : language === "hi" ? "SSA foreground service, persistent notification, boot recovery और relay queue का उपयोग करता है। Android force-stop, OEM policy या permission बंद होने पर कोई ऐप निरंतर चलने की गारंटी नहीं दे सकता।" : "SSA uses a foreground service, persistent notification, boot recovery, and relay queue on a best-effort basis. Android force-stop, OEM policy, or disabled permissions can still stop an app."}</Text><SsaButton label={text.batterySettings} variant="secondary" onPress={() => void openBatterySettings()} /></SsaCard>
    <SsaCard><Text style={styles.section}>{text.privacy}</Text><Text style={styles.body}>{language === "bn" ? "বার্তার plaintext relay ফোনে থাকে না। Recipient-এর public key দিয়ে encrypted payload তৈরি হয় এবং sender metadata-এর সঙ্গে signature যুক্ত থাকে।" : language === "hi" ? "संदेश का plaintext relay फ़ोन में नहीं रहता। Recipient की public key से encrypted payload बनता है और sender metadata के साथ signature जुड़ा रहता है।" : "Message plaintext is not stored on relay phones. The payload is encrypted to the recipient public key and signed with sender metadata."}</Text></SsaCard>
    <SsaCard><Text style={styles.section}>{text.device}</Text><Text style={styles.optionMeta}>Local secure peer ID</Text><Text selectable style={styles.peerId}>{peerId ? `${peerId.slice(0, 22)}…` : (language === "bn" ? "পরিচয় তৈরি হচ্ছে…" : language === "hi" ? "पहचान बन रही है…" : "Creating identity…")}</Text><Text style={styles.note}>{language === "bn" ? "Identity SecureStore-এ থাকে। নতুন identity তৈরি হলে পুরনো পরিচয়ের সঙ্গে peer verification আর মিলবে না।" : language === "hi" ? "Identity SecureStore में रहती है। नई identity बनने पर पुराने peer verification मेल नहीं खाएँगे।" : "The identity stays in SecureStore. If a new identity is created, previous peer verifications will no longer match."}</Text><Text style={styles.note}>{STORAGE_BOUNDARY}</Text></SsaCard>
    <SsaButton label={text.onboarding} variant="secondary" onPress={() => router.push("/onboarding")} />
  </ScrollView></ScreenContainer>;
}

function makeStyles(colors: SsaColors) {
  return StyleSheet.create({
    content: { padding: 18, gap: 13, paddingBottom: 30 },
    header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    eyebrow: { color: colors.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
    title: { color: colors.foreground, fontSize: 25, fontWeight: "900", marginTop: 5 },
    subtitle: { color: colors.muted, fontSize: 12, marginTop: 5, maxWidth: 230 },
    back: { color: colors.primary, fontSize: 13, fontWeight: "800" },
    section: { color: colors.foreground, fontSize: 14, fontWeight: "900", marginBottom: 4 },
    helper: { color: colors.faint, fontSize: 11, marginBottom: 4 },
    optionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 10, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, borderRadius: 10 },
    selectedRow: { backgroundColor: colors.surfaceRaised },
    optionTitle: { color: colors.foreground, fontSize: 13, fontWeight: "800" },
    optionMeta: { color: colors.faint, fontSize: 11, marginTop: 3 },
    selected: { color: colors.success, fontSize: 11, fontWeight: "800" },
    unselected: { color: "transparent", fontSize: 11 },
    body: { color: colors.muted, fontSize: 12, lineHeight: 20, marginBottom: 12 },
    peerId: { color: colors.primary, fontSize: 12, marginTop: 8 },
    note: { color: colors.faint, fontSize: 10, lineHeight: 16, marginTop: 9 },
  });
}
