import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { AlertTypeTile, PeerRow, SsaButton, SsaCard, StatusPill } from "@/components/ssa/ssa-ui";
import { ALERT_KIND_ORDER, SSA_COLORS, SSA_COPY } from "@/constants/ssa";
import { useSanketly } from "@/lib/sanketly-provider";

export default function HomeScreen() {
  const { meshStatus, peers, alerts, pendingNearbyRequests, startMesh, stopMesh, acceptNearbyRequest, rejectNearbyRequest } = useSanketly();
  const meshActive = meshStatus.state === "ready" || meshStatus.state === "starting";

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>SSA · OFFLINE ALERT NETWORK</Text>
            <Text style={styles.title}>{SSA_COPY.appName}</Text>
            <Text style={styles.tagline}>{SSA_COPY.tagline}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push("/settings")} style={styles.settingsIcon}><Text style={styles.settingsIconText}>⚙</Text></Pressable>
        </View>

        <SsaCard style={styles.heroCard}>
          <StatusPill state={meshStatus.state} detail={meshStatus.detail} />
          <Text style={styles.heroTitle}>আপনার বার্তা কাছের ফোনে পৌঁছাবে</Text>
          <Text style={styles.heroBody}>ইন্টারনেট না থাকলেও, SSA আশেপাশের যাচাই করা ফোনের মাধ্যমে জরুরি বার্তা এগিয়ে দেয়।</Text>
          <SsaButton label={meshActive ? SSA_COPY.stop : SSA_COPY.start} onPress={() => void (meshActive ? stopMesh() : startMesh())} />
          <Text style={styles.hint}>বার্তা আগে কিউতে থাকবে। সফলভাবে পৌঁছানোর প্রমাণ না আসা পর্যন্ত ‘পৌঁছেছে’ বলা হবে না।</Text>
        </SsaCard>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>জরুরি কাজ</Text><Text style={styles.sectionMeta}>SSA pilot</Text></View>
        <View style={styles.actionGrid}>
          <Pressable onPress={() => router.push("/alerts/compose")} style={({ pressed }) => [styles.actionCard, styles.actionPrimary, pressed && styles.pressed]}>
            <Text style={styles.actionIcon}>!</Text><Text style={styles.actionTitle}>জরুরি বার্তা পাঠান</Text><Text style={styles.actionSubtitle}>বন্যা · আগুন · চিকিৎসা · SOS</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/alerts")} style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}>
            <Text style={styles.actionIconSecondary}>▤</Text><Text style={styles.actionTitle}>আমার সতর্কবার্তা</Text><Text style={styles.actionSubtitle}>{alerts.length ? `${alerts.length}টি সংরক্ষিত রেকর্ড` : "এখনও কোনো রেকর্ড নেই"}</Text>
          </Pressable>
        </View>

        <SsaCard>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>এক নজরে সতর্কবার্তা</Text><Pressable onPress={() => router.push("/alerts")}><Text style={styles.link}>সব দেখুন</Text></Pressable></View>
          <View style={styles.typeGrid}>{ALERT_KIND_ORDER.map((kind) => <AlertTypeTile key={kind} kind={kind} selected={false} onPress={() => router.push({ pathname: "/alerts/compose", params: { kind } })} />)}</View>
        </SsaCard>

        {pendingNearbyRequests.length > 0 ? <SsaCard style={styles.requestCard}>
          <Text style={styles.requestTitle}>কাছের ফোন সংযোগ চাইছে</Text>
          <Text style={styles.requestBody}>ফোনটি সত্যিই কাছে এবং আপনার SSA pilot group-এর হলে তবেই অনুমতি দিন।</Text>
          {pendingNearbyRequests.map((request) => <View key={request.endpointId} style={styles.requestRow}>
            <Text style={styles.requestName}>{request.name || "SSA device"}</Text>
            <View style={styles.requestActions}><Pressable onPress={() => void rejectNearbyRequest(request.endpointId)} style={styles.reject}><Text style={styles.rejectText}>না</Text></Pressable><Pressable onPress={() => void acceptNearbyRequest(request.endpointId)} style={styles.accept}><Text style={styles.acceptText}>অনুমতি</Text></Pressable></View>
          </View>)}
        </SsaCard> : null}

        <SsaCard>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>কাছের SSA ফোন</Text><Pressable onPress={() => router.push("/network")}><Text style={styles.link}>নেটওয়ার্ক দেখুন</Text></Pressable></View>
          {peers.length === 0 ? <Text style={styles.emptyBody}>এখনও কোনো পরিচিত ফোন নেই। কাছের ফোন খুঁজতে উপরের বোতাম চাপুন এবং দুই ফোনেই Nearby অনুমতি দিন।</Text> : peers.slice(0, 3).map((peer) => <PeerRow key={peer.peerId} peer={peer} onPress={() => router.push({ pathname: "/chat/[peerId]", params: { peerId: peer.peerId } })} />)}
        </SsaCard>

        <Pressable onPress={() => router.push("/onboarding")}><Text style={styles.learnMore}>SSA কীভাবে কাজ করে জানুন ›</Text></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30, gap: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  eyebrow: { color: SSA_COLORS.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: SSA_COLORS.foreground, fontSize: 25, fontWeight: "900", marginTop: 5 },
  tagline: { color: SSA_COLORS.primary, fontSize: 12, fontWeight: "700", marginTop: 4 },
  settingsIcon: { width: 42, height: 42, borderRadius: 21, borderColor: SSA_COLORS.border, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  settingsIconText: { color: SSA_COLORS.muted, fontSize: 19 },
  heroCard: { backgroundColor: "#17213C", gap: 12 },
  heroTitle: { color: SSA_COLORS.foreground, fontSize: 23, lineHeight: 29, fontWeight: "900", marginTop: 3 },
  heroBody: { color: SSA_COLORS.muted, fontSize: 13, lineHeight: 20 },
  hint: { color: SSA_COLORS.faint, fontSize: 10, lineHeight: 15 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { color: SSA_COLORS.foreground, fontSize: 16, fontWeight: "900" },
  sectionMeta: { color: SSA_COLORS.faint, fontSize: 11 },
  link: { color: SSA_COLORS.primary, fontSize: 12, fontWeight: "800" },
  actionGrid: { flexDirection: "row", gap: 10 },
  actionCard: { flex: 1, minHeight: 122, borderRadius: 18, borderColor: SSA_COLORS.border, borderWidth: 1, backgroundColor: SSA_COLORS.surface, padding: 14, justifyContent: "space-between" },
  actionPrimary: { backgroundColor: "#382331", borderColor: "#704250" },
  actionIcon: { color: SSA_COLORS.danger, fontSize: 26, fontWeight: "900" },
  actionIconSecondary: { color: SSA_COLORS.primary, fontSize: 24, fontWeight: "900" },
  actionTitle: { color: SSA_COLORS.foreground, fontSize: 14, fontWeight: "900" },
  actionSubtitle: { color: SSA_COLORS.muted, fontSize: 10, lineHeight: 14 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  requestCard: { backgroundColor: SSA_COLORS.criticalSurface, borderColor: "#694052" },
  requestTitle: { color: "#FFE6EA", fontSize: 15, fontWeight: "900" },
  requestBody: { color: "#DDBDC6", fontSize: 12, lineHeight: 18, marginBottom: 5 },
  requestRow: { borderTopColor: "#5B3746", borderTopWidth: 1, paddingTop: 10, marginTop: 3, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  requestName: { color: SSA_COLORS.foreground, fontSize: 13, fontWeight: "700", flex: 1 },
  requestActions: { flexDirection: "row", gap: 8 },
  reject: { borderColor: "#875A69", borderWidth: 1, borderRadius: 9, minHeight: 34, paddingHorizontal: 12, justifyContent: "center" },
  rejectText: { color: "#F3CFD7", fontSize: 12, fontWeight: "800" },
  accept: { backgroundColor: SSA_COLORS.success, borderRadius: 9, minHeight: 34, paddingHorizontal: 12, justifyContent: "center" },
  acceptText: { color: "#12261F", fontSize: 12, fontWeight: "900" },
  emptyBody: { color: SSA_COLORS.muted, fontSize: 12, lineHeight: 18 },
  learnMore: { color: SSA_COLORS.primary, textAlign: "center", fontSize: 12, fontWeight: "800", paddingVertical: 4 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
