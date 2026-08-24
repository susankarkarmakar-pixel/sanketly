import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { SsaButton, SsaCard } from "@/components/ssa/ssa-ui";
import { SSA_COLORS, SSA_COPY } from "@/constants/ssa";

const STEPS = [
  { number: "১", title: "কাছের ফোন খুঁজুন", body: "Nearby Connections ব্যবহার করে কাছাকাছি SSA ফোনের সঙ্গে সংযোগ তৈরি হয়। ইন্টারনেট থাকা বাধ্যতামূলক নয়।" },
  { number: "২", title: "বার্তা এনক্রিপ্ট হয়", body: "শুধু নির্দিষ্ট recipient-এর public key দিয়ে বার্তা encrypted হয়। মাঝের relay ফোন ciphertext ছাড়া আর কিছু পড়তে পারে না।" },
  { number: "৩", title: "সেতু পেরিয়ে এগিয়ে যায়", body: "প্রথম ফোন সরাসরি না পৌঁছালে যাচাই করা relay ফোন packet এগিয়ে দিতে পারে। একই packet বারবার হলে duplicate হিসেবে বাদ পড়ে।" },
  { number: "৪", title: "অবস্থা সত্যি করে দেখায়", body: "কিউতে থাকা, relay হওয়া এবং পৌঁছানোর প্রমাণ আলাদা। SSA কোনো native send acceptance-কে delivered বলে দেখায় না।" },
];

export default function OnboardingScreen() {
  return <ScreenContainer edges={["top", "left", "right", "bottom"]}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><Text style={styles.eyebrow}>SSA / HOW IT WORKS</Text><Text onPress={() => router.back()} style={styles.back}>ফিরুন</Text></View>
    <Text style={styles.title}>{SSA_COPY.appName}</Text><Text style={styles.tagline}>{SSA_COPY.tagline}</Text><Text style={styles.intro}>কম সংযোগের এলাকায় জরুরি তথ্যের জন্য কাছের ফোনগুলোকে ছোট ছোট সেতু হিসেবে ব্যবহার করার চেষ্টা।</Text>
    {STEPS.map((step) => <SsaCard key={step.number} style={styles.step}><View style={styles.number}><Text style={styles.numberText}>{step.number}</Text></View><View style={styles.stepCopy}><Text style={styles.stepTitle}>{step.title}</Text><Text style={styles.stepBody}>{step.body}</Text></View></SsaCard>)}
    <SsaCard style={styles.boundary}><Text style={styles.boundaryTitle}>মনে রাখবেন</Text><Text style={styles.stepBody}>এটি best-effort emergency communication। Nearby radio range, অনুমতি, battery policy, Android version, OEM behavior এবং অন্য ফোনের উপস্থিতির ওপর ফল নির্ভর করে। জীবন-রক্ষাকারী সিদ্ধান্তে স্থানীয় প্রশাসন, ফোন কল বা অন্য উপলব্ধ পথও ব্যবহার করুন।</Text></SsaCard>
    <SsaButton label="ড্যাশবোর্ডে ফিরুন" onPress={() => router.replace("/")} />
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 13, paddingBottom: 30 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: SSA_COLORS.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  back: { color: SSA_COLORS.primary, fontSize: 13, fontWeight: "800" },
  title: { color: SSA_COLORS.foreground, fontSize: 28, fontWeight: "900", marginTop: 7 },
  tagline: { color: SSA_COLORS.primary, fontSize: 13, fontWeight: "800" },
  intro: { color: SSA_COLORS.muted, fontSize: 13, lineHeight: 21, marginBottom: 2 },
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  number: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#2B3D6A", alignItems: "center", justifyContent: "center" },
  numberText: { color: SSA_COLORS.primary, fontSize: 16, fontWeight: "900" },
  stepCopy: { flex: 1, gap: 5 },
  stepTitle: { color: SSA_COLORS.foreground, fontSize: 15, fontWeight: "900" },
  stepBody: { color: SSA_COLORS.muted, fontSize: 12, lineHeight: 19 },
  boundary: { borderColor: "#735A40", backgroundColor: "#2A241B" },
  boundaryTitle: { color: SSA_COLORS.warning, fontSize: 14, fontWeight: "900", marginBottom: 7 },
});
