import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createStructuredAlert, type AlertPriority, type StructuredAlertKind } from "@sanketly/domain";
import { ScreenContainer } from "@/components/screen-container";
import { AlertTypeTile, PriorityChip, SsaButton, SsaCard } from "@/components/ssa/ssa-ui";
import { ALERT_KIND_LABELS, ALERT_KIND_ORDER, ALERT_PRIORITY_LABELS, SSA_COLORS } from "@/constants/ssa";
import { createId } from "@/lib/storage";
import { useSanketly } from "@/lib/sanketly-provider";

export default function ComposeAlertScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const { peers, queueAlert } = useSanketly();
  const [kind, setKind] = useState<StructuredAlertKind>(ALERT_KIND_ORDER.includes(params.kind as StructuredAlertKind) ? params.kind as StructuredAlertKind : "sos");
  const [priority, setPriority] = useState<AlertPriority>("critical");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [village, setVillage] = useState("");
  const [ward, setWard] = useState("");
  const [targetPeerId, setTargetPeerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const authenticatedPeers = useMemo(() => peers.filter((peer) => peer.verified && peer.encryptionPublicKey && peer.connectionState === "connected"), [peers]);
  useEffect(() => {
    if (!targetPeerId && authenticatedPeers[0]) setTargetPeerId(authenticatedPeers[0].peerId);
  }, [authenticatedPeers, targetPeerId]);

  async function submit(): Promise<void> {
    if (!targetPeerId) { setError("কাছের যাচাই করা ফোন পাওয়া যায়নি। আগে নেটওয়ার্ক চালু করুন।"); return; }
    setError(null);
    try {
      setSending(true);
      const now = Date.now();
      const alert = createStructuredAlert({ alertId: createId("alert"), kind, priority, title: title.trim() || ALERT_KIND_LABELS[kind].bn, description: description.trim(), village: village.trim(), ward: ward.trim() || undefined, createdAt: now, expiresAt: now + 24 * 60 * 60 * 1000 });
      await queueAlert(targetPeerId, alert);
      router.replace("/alerts");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "বার্তা তৈরি করা যায়নি");
    } finally {
      setSending(false);
    }
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>SSA / NEW ALERT</Text><Text style={styles.title}>জরুরি বার্তা পাঠান</Text><Text style={styles.subtitle}>বার্তা এনক্রিপ্ট হয়ে কাছের যাচাই করা ফোনে যাবে</Text></View><Pressable onPress={() => router.back()}><Text style={styles.close}>বাতিল</Text></Pressable></View>
        <SsaCard><Text style={styles.label}>১ · কী ঘটেছে?</Text><View style={styles.typeGrid}>{ALERT_KIND_ORDER.map((entry) => <AlertTypeTile key={entry} kind={entry} selected={kind === entry} onPress={() => setKind(entry)} />)}</View></SsaCard>
        <SsaCard>
          <Text style={styles.label}>২ · কতটা জরুরি?</Text>
          <View style={styles.priorityRow}>{(Object.keys(ALERT_PRIORITY_LABELS) as AlertPriority[]).map((entry) => <Pressable key={entry} onPress={() => setPriority(entry)} style={[styles.priorityOption, priority === entry && styles.priorityOptionSelected]}><PriorityChip priority={entry} /><Text style={styles.priorityEn}>{ALERT_PRIORITY_LABELS[entry].en}</Text></Pressable>)}</View>
        </SsaCard>
        <SsaCard>
          <Text style={styles.label}>৩ · বিস্তারিত লিখুন</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="শিরোনাম (যেমন: বাঁধ ভেঙেছে)" placeholderTextColor={SSA_COLORS.faint} style={styles.input} returnKeyType="next" />
          <TextInput value={description} onChangeText={setDescription} placeholder="মানুষকে কী জানতে বা করতে হবে?" placeholderTextColor={SSA_COLORS.faint} style={[styles.input, styles.multiline]} multiline textAlignVertical="top" />
          <View style={styles.twoInputs}><TextInput value={village} onChangeText={setVillage} placeholder="গ্রাম / এলাকা*" placeholderTextColor={SSA_COLORS.faint} style={[styles.input, styles.half]} /><TextInput value={ward} onChangeText={setWard} placeholder="ওয়ার্ড" placeholderTextColor={SSA_COLORS.faint} style={[styles.input, styles.half]} /></View>
        </SsaCard>
        <SsaCard>
          <Text style={styles.label}>৪ · প্রথম সেতু বেছে নিন</Text>
          {authenticatedPeers.length === 0 ? <Text style={styles.empty}>কোনো যাচাই করা কাছের ফোন নেই। বার্তা পাঠাতে অন্তত একটি authenticated peer লাগবে।</Text> : authenticatedPeers.map((peer) => <Pressable key={peer.peerId} onPress={() => setTargetPeerId(peer.peerId)} style={[styles.targetRow, targetPeerId === peer.peerId && styles.targetSelected]}><View style={styles.radio}>{targetPeerId === peer.peerId ? <View style={styles.radioDot} /> : null}</View><View><Text style={styles.targetName}>{peer.displayName ?? "কাছের SSA ফোন"}</Text><Text style={styles.targetMeta}>Nearby · verified</Text></View></Pressable>)}
        </SsaCard>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <SsaButton label={sending ? "এনক্রিপ্ট করা হচ্ছে…" : "নিরাপদে জরুরি বার্তা পাঠান"} onPress={() => void submit()} disabled={sending || !village.trim() || !description.trim()} variant="danger" />
        <Text style={styles.footnote}>SSA এখন শুধু queued / relaying / delivered অবস্থা দেখাবে। কাছের ফোনে API গ্রহণ করলেই বার্তা পৌঁছেছে—এমন দাবি করা হবে না।</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 13, paddingBottom: 30 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 },
  eyebrow: { color: SSA_COLORS.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: SSA_COLORS.foreground, fontSize: 24, fontWeight: "900", marginTop: 5 },
  subtitle: { color: SSA_COLORS.muted, fontSize: 12, marginTop: 4 },
  close: { color: SSA_COLORS.primary, fontSize: 13, fontWeight: "800", paddingTop: 3 },
  label: { color: SSA_COLORS.foreground, fontSize: 14, fontWeight: "900", marginBottom: 12 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityOption: { flex: 1, minHeight: 54, alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 12, borderWidth: 1, borderColor: SSA_COLORS.border },
  priorityOptionSelected: { borderColor: SSA_COLORS.primary, backgroundColor: "#27365B" },
  priorityEn: { color: SSA_COLORS.faint, fontSize: 10 },
  input: { minHeight: 46, borderRadius: 11, borderColor: SSA_COLORS.border, borderWidth: 1, backgroundColor: "#11182B", color: SSA_COLORS.foreground, paddingHorizontal: 12, fontSize: 13, marginBottom: 9 },
  multiline: { minHeight: 92, paddingTop: 12 },
  twoInputs: { flexDirection: "row", gap: 9 },
  half: { flex: 1 },
  empty: { color: SSA_COLORS.muted, fontSize: 12, lineHeight: 18 },
  targetRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 11, borderRadius: 12, borderColor: SSA_COLORS.border, borderWidth: 1, marginTop: 8 },
  targetSelected: { borderColor: SSA_COLORS.primary, backgroundColor: "#27365B" },
  radio: { width: 20, height: 20, borderRadius: 10, borderColor: SSA_COLORS.faint, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: SSA_COLORS.primary },
  targetName: { color: SSA_COLORS.foreground, fontSize: 13, fontWeight: "800" },
  targetMeta: { color: SSA_COLORS.faint, fontSize: 10, marginTop: 2 },
  error: { color: SSA_COLORS.danger, backgroundColor: "#351E2B", borderColor: "#6F3C4A", borderWidth: 1, borderRadius: 11, padding: 11, fontSize: 12, lineHeight: 18 },
  footnote: { color: SSA_COLORS.faint, textAlign: "center", fontSize: 10, lineHeight: 15 },
});
