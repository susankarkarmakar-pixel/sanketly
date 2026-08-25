import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { SsaButton, SsaCard } from "@/components/ssa/ssa-ui";
import { useSsaTheme, type SsaColors } from "@/lib/ssa-theme";

export default function OnboardingScreen() {
  const { colors, text, language } = useSsaTheme();
  const styles = makeStyles(colors);
  const steps = language === "bn" ? [
    ["১", "কাছের ফোন খুঁজুন", "Nearby Connections ব্যবহার করে কাছাকাছি SSA ফোনের সঙ্গে সংযোগ তৈরি হয়। ইন্টারনেট থাকা বাধ্যতামূলক নয়।"],
    ["২", "বার্তা এনক্রিপ্ট হয়", "শুধু নির্দিষ্ট recipient-এর public key দিয়ে বার্তা encrypted হয়। মাঝের relay ফোন ciphertext ছাড়া আর কিছু পড়তে পারে না।"],
    ["৩", "সেতু পেরিয়ে এগিয়ে যায়", "প্রথম ফোন সরাসরি না পৌঁছালে যাচাই করা relay ফোন packet এগিয়ে দিতে পারে। একই packet বারবার হলে duplicate হিসেবে বাদ পড়ে।"],
    ["৪", "অবস্থা সত্যি করে দেখায়", "কিউতে থাকা, relay হওয়া এবং পৌঁছানোর প্রমাণ আলাদা। SSA কোনো native send acceptance-কে delivered বলে দেখায় না."],
  ] : language === "hi" ? [
    ["१", "नज़दीकी फ़ोन खोजें", "Nearby Connections से नज़दीकी SSA फ़ोन से जुड़ने की कोशिश होती है। इंटरनेट ज़रूरी नहीं है।"],
    ["२", "संदेश एन्क्रिप्ट होता है", "संदेश केवल चुने गए recipient की public key से encrypted होता है। बीच का relay फ़ोन ciphertext नहीं पढ़ सकता।"],
    ["३", "सेतु के रास्ते आगे जाता है", "यदि पहला फ़ोन सीधे नहीं पहुँचता, तो सत्यापित relay फ़ोन packet आगे भेज सकता है। duplicate packet को हटा दिया जाता है।"],
    ["४", "स्थिति ईमानदारी से दिखती है", "कतार, relay और पहुँचने का प्रमाण अलग-अलग हैं। SSA native send acceptance को delivered नहीं कहता।"],
  ] : [
    ["1", "Find nearby phones", "Nearby Connections tries to connect to SSA phones nearby. Internet access is not required."],
    ["2", "Messages are encrypted", "A message is encrypted to the selected recipient’s public key. A relay phone cannot read the ciphertext."],
    ["3", "It can cross a bridge", "If the first phone cannot reach the destination directly, a verified relay phone can forward the packet. Duplicates are dropped."],
    ["4", "Status stays honest", "Queued, relaying, and delivery evidence are separate. SSA does not call native send acceptance delivered."],
  ];
  return <ScreenContainer edges={["top", "left", "right", "bottom"]}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><Text style={styles.eyebrow}>SSA / HOW IT WORKS</Text><Text onPress={() => router.back()} style={styles.back}>{text.back}</Text></View>
    <Text style={styles.title}>{text.appName}</Text><Text style={styles.tagline}>{text.tagline}</Text><Text style={styles.intro}>{language === "bn" ? "কম সংযোগের এলাকায় জরুরি তথ্যের জন্য কাছের ফোনগুলোকে ছোট ছোট সেতু হিসেবে ব্যবহার করার চেষ্টা।" : language === "hi" ? "कम कनेक्शन वाले क्षेत्रों में आपातकालीन जानकारी के लिए नज़दीकी फ़ोन छोटे सेतु की तरह काम कर सकते हैं।" : "In low-connectivity areas, nearby phones can act as small bridges for emergency information."}</Text>
    {steps.map(([number, title, body]) => <SsaCard key={number} style={styles.step}><View style={styles.number}><Text style={styles.numberText}>{number}</Text></View><View style={styles.stepCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepBody}>{body}</Text></View></SsaCard>)}
    <SsaCard style={styles.boundary}><Text style={styles.boundaryTitle}>{language === "bn" ? "মনে রাখবেন" : language === "hi" ? "ध्यान रखें" : "Remember"}</Text><Text style={styles.stepBody}>{language === "bn" ? "এটি best-effort emergency communication। Nearby radio range, অনুমতি, battery policy, Android version, OEM behavior এবং অন্য ফোনের উপস্থিতির ওপর ফল নির্ভর করে। জীবন-রক্ষাকারী সিদ্ধান্তে স্থানীয় প্রশাসন, ফোন কল বা অন্য উপলব্ধ পথও ব্যবহার করুন।" : language === "hi" ? "यह best-effort emergency communication है। परिणाम radio range, permissions, battery policy, Android version, OEM behavior और दूसरे फ़ोन की उपलब्धता पर निर्भर करता है। जीवन बचाने वाले निर्णयों में स्थानीय प्रशासन, फ़ोन कॉल या अन्य उपलब्ध रास्तों का भी उपयोग करें।" : "This is best-effort emergency communication. Results depend on radio range, permissions, battery policy, Android version, OEM behavior, and other phones nearby. For life-saving decisions, also use local administration, phone calls, or any other available path."}</Text></SsaCard>
    <SsaButton label={text.dashboard} onPress={() => router.replace("/")} />
  </ScrollView></ScreenContainer>;
}

function makeStyles(colors: SsaColors) {
  return StyleSheet.create({
    content: { padding: 18, gap: 13, paddingBottom: 30 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    eyebrow: { color: colors.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
    back: { color: colors.primary, fontSize: 13, fontWeight: "800" },
    title: { color: colors.foreground, fontSize: 28, fontWeight: "900", marginTop: 7 },
    tagline: { color: colors.primary, fontSize: 13, fontWeight: "800" },
    intro: { color: colors.muted, fontSize: 13, lineHeight: 21, marginBottom: 2 },
    step: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    number: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
    numberText: { color: colors.primary, fontSize: 16, fontWeight: "900" },
    stepCopy: { flex: 1, gap: 5 },
    stepTitle: { color: colors.foreground, fontSize: 15, fontWeight: "900" },
    stepBody: { color: colors.muted, fontSize: 12, lineHeight: 19 },
    boundary: { borderColor: colors.warning, backgroundColor: colors.surfaceRaised },
    boundaryTitle: { color: colors.warning, fontSize: 14, fontWeight: "900", marginBottom: 7 },
  });
}
