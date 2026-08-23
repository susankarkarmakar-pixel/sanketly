import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useSanketly, type LocalMessage } from "@/lib/sanketly-provider";

export default function ChatScreen() {
  const { peerId: rawPeerId } = useLocalSearchParams<{ peerId: string }>();
  const peerId = Array.isArray(rawPeerId) ? rawPeerId[0] : rawPeerId;
  const { messages, queueMessage, meshStatus } = useSanketly();
  const [draft, setDraft] = useState("");
  const conversation = useMemo(() => messages[peerId ?? ""] ?? [], [messages, peerId]);

  async function handleSend() {
    if (!peerId || !draft.trim()) return;
    await queueMessage(peerId, draft);
    setDraft("");
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Development peer</Text>
            <Text style={styles.headerMeta}>{peerId ?? "unknown"} · {meshStatus.state}</Text>
          </View>
          <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>E2E</Text></View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Protocol outbox enabled</Text>
          <Text style={styles.noticeBody}>Messages are persisted as queued records. Native session encryption and BLE delivery will replace the development placeholder in the next milestone.</Text>
        </View>

        <FlatList
          style={styles.list}
          contentContainerStyle={conversation.length === 0 ? styles.emptyList : styles.listContent}
          data={conversation}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Send a test message to exercise the local outbox.</Text>}
        />

        <View style={styles.composerRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write an encrypted message…"
            placeholderTextColor="#687590"
            style={styles.input}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => void handleSend()}
          />
          <Pressable accessibilityRole="button" onPress={() => void handleSend()} style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}>
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function MessageBubble({ message }: { message: LocalMessage }) {
  return (
    <View style={styles.messageRow}>
      <View style={styles.messageBubble}>
        <Text style={styles.messageText}>{message.body}</Text>
        <Text style={styles.messageMeta}>{message.deliveryState} · {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 14, borderBottomColor: "#28334F", borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backText: { color: "#C8D3F4", fontSize: 34, lineHeight: 36 },
  headerCopy: { flex: 1, marginLeft: 4, gap: 3 },
  headerTitle: { color: "#F6F7FB", fontSize: 16, fontWeight: "800" },
  headerMeta: { color: "#7F8AA5", fontSize: 11 },
  headerBadge: { borderColor: "#3C8F73", borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  headerBadgeText: { color: "#6FE0AC", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  notice: { backgroundColor: "#141D31", borderColor: "#273A62", borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 14, gap: 4 },
  noticeTitle: { color: "#AFC2FF", fontSize: 12, fontWeight: "800" },
  noticeBody: { color: "#8F9AB5", fontSize: 11, lineHeight: 17 },
  list: { flex: 1, marginTop: 12 },
  listContent: { paddingVertical: 8, gap: 10 },
  emptyList: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyText: { color: "#7F8AA5", fontSize: 13, lineHeight: 20, textAlign: "center" },
  messageRow: { alignItems: "flex-end" },
  messageBubble: { backgroundColor: "#273B69", borderRadius: 17, borderBottomRightRadius: 5, paddingHorizontal: 14, paddingVertical: 10, maxWidth: "86%", gap: 5 },
  messageText: { color: "#F3F5FF", fontSize: 15, lineHeight: 21 },
  messageMeta: { color: "#AFC2FF", fontSize: 10, textAlign: "right" },
  composerRow: { flexDirection: "row", alignItems: "flex-end", paddingVertical: 12, gap: 8 },
  input: { flex: 1, minHeight: 46, maxHeight: 120, backgroundColor: "#171E35", borderColor: "#2B3655", borderWidth: 1, borderRadius: 15, color: "#F6F7FB", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, fontSize: 14 },
  sendButton: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#89A9FF" },
  sendText: { color: "#10162A", fontSize: 24, fontWeight: "700" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
