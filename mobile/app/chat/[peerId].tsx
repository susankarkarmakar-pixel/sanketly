import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useSsaTheme, type SsaColors } from "@/lib/ssa-theme";
import { useSanketly, type LocalMessage } from "@/lib/sanketly-provider";

export default function ChatScreen() {
  const { peerId: rawPeerId } = useLocalSearchParams<{ peerId: string }>();
  const peerId = Array.isArray(rawPeerId) ? rawPeerId[0] : rawPeerId;
  const { messages, queueMessage, meshStatus } = useSanketly();
  const { colors, language } = useSsaTheme();
  const styles = makeStyles(colors);
  const [draft, setDraft] = useState("");
  const conversation = useMemo(() => messages[peerId ?? ""] ?? [], [messages, peerId]);
  const copy = language === "bn" ? { title: "SSA পরীক্ষামূলক চ্যানেল", noticeTitle: "SSA বার্তা outbox চালু", noticeBody: "SSA বার্তা durable outbox-এ যাওয়ার আগে sealed হয়। Authenticated nearby transport না পাওয়া পর্যন্ত delivery queued থাকে।", empty: "এখনও কোনো বার্তা নেই। বার্তা encrypted করতে authenticated nearby peer দরকার।", placeholder: "Encrypted message লিখুন…", errorTitle: "বার্তা queue করা যায়নি", errorBody: "এই বার্তা encrypted করা যায়নি" } : language === "hi" ? { title: "SSA परीक्षण चैनल", noticeTitle: "SSA संदेश outbox चालू", noticeBody: "SSA संदेश durable outbox में जाने से पहले sealed होता है। Authenticated nearby transport मिलने तक delivery queued रहती है।", empty: "अभी कोई संदेश नहीं है। संदेश encrypt करने के लिए authenticated nearby peer चाहिए।", placeholder: "Encrypted संदेश लिखें…", errorTitle: "संदेश कतार में नहीं गया", errorBody: "यह संदेश encrypted नहीं हो सका" } : { title: "SSA test channel", noticeTitle: "SSA message outbox enabled", noticeBody: "SSA messages are sealed before entering the durable outbox. Delivery remains queued until an authenticated nearby transport is available.", empty: "No messages yet. An authenticated nearby peer is required before a message can be encrypted.", placeholder: "Write an encrypted message…", errorTitle: "Message not queued", errorBody: "Unable to encrypt this message" };

  async function handleSend() {
    if (!peerId || !draft.trim()) return;
    try {
      await queueMessage(peerId, draft);
      setDraft("");
    } catch (error) {
      Alert.alert(copy.errorTitle, error instanceof Error ? error.message : copy.errorBody);
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={styles.headerCopy}><Text style={styles.headerTitle}>{copy.title}</Text><Text style={styles.headerMeta}>{peerId ?? "unknown"} · {meshStatus.state}</Text></View>
          <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>E2E</Text></View>
        </View>
        <View style={styles.notice}><Text style={styles.noticeTitle}>{copy.noticeTitle}</Text><Text style={styles.noticeBody}>{copy.noticeBody}</Text></View>
        <FlatList style={styles.list} contentContainerStyle={conversation.length === 0 ? styles.emptyList : styles.listContent} data={conversation} keyExtractor={(item) => item.id} renderItem={({ item }) => <MessageBubble message={item} colors={colors} />} ListEmptyComponent={<Text style={styles.emptyText}>{copy.empty}</Text>} />
        <View style={styles.composerRow}><TextInput value={draft} onChangeText={setDraft} placeholder={copy.placeholder} placeholderTextColor={colors.faint} style={styles.input} multiline returnKeyType="send" onSubmitEditing={() => void handleSend()} /><Pressable accessibilityRole="button" onPress={() => void handleSend()} style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}><Text style={styles.sendText}>↑</Text></Pressable></View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function MessageBubble({ message, colors }: { message: LocalMessage; colors: SsaColors }) {
  return <View style={stylesFor(colors).messageRow}><View style={stylesFor(colors).messageBubble}><Text style={stylesFor(colors).messageText}>{message.body}</Text><Text style={stylesFor(colors).messageMeta}>{message.deliveryState} · {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text></View></View>;
}

function makeStyles(colors: SsaColors) {
  return StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16 },
    header: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 14, borderBottomColor: colors.border, borderBottomWidth: 1 },
    backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    backText: { color: colors.primary, fontSize: 34, lineHeight: 36 },
    headerCopy: { flex: 1, marginLeft: 4, gap: 3 },
    headerTitle: { color: colors.foreground, fontSize: 16, fontWeight: "800" },
    headerMeta: { color: colors.faint, fontSize: 11 },
    headerBadge: { borderColor: colors.success, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
    headerBadgeText: { color: colors.success, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
    notice: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 14, gap: 4 },
    noticeTitle: { color: colors.primary, fontSize: 12, fontWeight: "800" },
    noticeBody: { color: colors.muted, fontSize: 11, lineHeight: 17 },
    list: { flex: 1, marginTop: 12 },
    listContent: { paddingVertical: 8, gap: 10 },
    emptyList: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    emptyText: { color: colors.faint, fontSize: 13, lineHeight: 20, textAlign: "center" },
    messageRow: { alignItems: "flex-end" },
    messageBubble: { backgroundColor: colors.surfaceRaised, borderRadius: 17, borderBottomRightRadius: 5, paddingHorizontal: 14, paddingVertical: 10, maxWidth: "86%", gap: 5 },
    messageText: { color: colors.foreground, fontSize: 15, lineHeight: 21 },
    messageMeta: { color: colors.primary, fontSize: 10, textAlign: "right" },
    composerRow: { flexDirection: "row", alignItems: "flex-end", paddingVertical: 12, gap: 8 },
    input: { flex: 1, minHeight: 46, maxHeight: 120, backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1, borderRadius: 15, color: colors.foreground, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, fontSize: 14 },
    sendButton: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
    sendText: { color: colors.primaryInk, fontSize: 24, fontWeight: "700" },
    pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  });
}

const stylesFor = makeStyles;
