import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { AlertTypeTile, PeerRow, SsaButton, SsaCard, SosHoldButton, StatusPill } from "@/components/ssa/ssa-ui";
import { ALERT_KIND_ORDER } from "@/constants/ssa";
import { alertKindLabel, useSsaTheme, type SsaColors } from "@/lib/ssa-theme";
import { deliveryLabel } from "@/features/alerts/alert-utils";
import { useSanketly } from "@/lib/sanketly-provider";

export default function HomeScreen() {
  const { meshStatus, peers, alerts, pendingNearbyRequests, startMesh, stopMesh, acceptNearbyRequest, rejectNearbyRequest } = useSanketly();
  const { colors, text, language } = useSsaTheme();
  const styles = makeStyles(colors);
  const meshActive = meshStatus.state === "ready" || meshStatus.state === "starting";

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>SSA · OFFLINE ALERT NETWORK</Text>
            <Text style={styles.title}>{text.appName}</Text>
            <Text style={styles.tagline}>{text.tagline}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={text.settings} onPress={() => router.push("/settings")} style={styles.settingsIcon}><Text style={styles.settingsIconText}>⚙</Text></Pressable>
        </View>

        <SsaCard style={styles.heroCard}>
          <StatusPill state={meshStatus.state} detail={meshStatus.detail} />
          <Text style={styles.heroTitle}>{text.sendToNearby}</Text>
          <Text style={styles.heroBody}>{text.offlineRelay}</Text>
          <SsaButton label={meshActive ? text.stop : text.start} onPress={() => void (meshActive ? stopMesh() : startMesh())} />
          <Text style={styles.hint}>{text.queueHint}</Text>
        </SsaCard>

        <SosHoldButton onConfirm={() => router.push({ pathname: "/alerts/compose", params: { kind: "sos" } })} />

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{text.emergencyWork}</Text><Text style={styles.sectionMeta}>{text.pilot}</Text></View>
        <View style={styles.actionGrid}>
          <Pressable accessibilityRole="button" onPress={() => router.push("/alerts/compose")} style={({ pressed }) => [styles.actionCard, styles.actionPrimary, pressed && styles.pressed]}>
            <Text style={styles.actionIcon}>!</Text><Text style={styles.actionTitle}>{text.sendAlert}</Text><Text style={styles.actionSubtitle}>{language === "bn" ? "বন্যা · আগুন · চিকিৎসা · SOS" : language === "hi" ? "बाढ़ · आग · चिकित्सा · SOS" : "Flood · Fire · Medical · SOS"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push("/alerts")} style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}>
            <Text style={styles.actionIconSecondary}>▤</Text><Text style={styles.actionTitle}>{text.alerts}</Text><Text style={styles.actionSubtitle}>{alerts.length ? text.savedRecords(alerts.length) : text.noRecords}</Text>
          </Pressable>
        </View>

        <SsaCard>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{text.recentAlerts}</Text><Pressable accessibilityRole="button" onPress={() => router.push("/alerts")}><Text style={styles.link}>{text.seeAll}</Text></Pressable></View>
          <View style={styles.typeGrid}>{ALERT_KIND_ORDER.map((kind) => <AlertTypeTile key={kind} kind={kind} selected={false} onPress={() => router.push({ pathname: "/alerts/compose", params: { kind } })} />)}</View>
          {alerts.length > 0 ? <View style={styles.recentList}>{alerts.slice(0, 3).map((record) => <Pressable accessibilityRole="button" key={record.messageId} onPress={() => router.push({ pathname: "/alerts/[messageId]", params: { messageId: record.messageId } })} style={styles.recentRow}><View style={[styles.recentMark, { backgroundColor: "#8EA9FF" }]} /><View style={styles.recentCopy}><Text style={styles.recentTitle} numberOfLines={1}>{record.alert.title}</Text><Text style={styles.recentMeta} numberOfLines={1}>{alertKindLabel(record.alert.kind, language)} · {record.alert.village} · {deliveryLabel(record.deliveryState, language)}</Text></View><Text style={styles.recentChevron}>›</Text></Pressable>)}</View> : <Text style={styles.recentEmpty}>{text.noAlerts}</Text>}
        </SsaCard>

        {pendingNearbyRequests.length > 0 ? <SsaCard style={styles.requestCard}>
          <Text style={styles.requestTitle}>{text.nearbyRequest}</Text>
          <Text style={styles.requestBody}>{text.verifyRequest}</Text>
          {pendingNearbyRequests.map((request) => <View key={request.endpointId} style={styles.requestRow}>
            <Text style={styles.requestName}>{request.name || "SSA device"}</Text>
            <View style={styles.requestActions}><Pressable accessibilityRole="button" onPress={() => void rejectNearbyRequest(request.endpointId)} style={styles.reject}><Text style={styles.rejectText}>{text.no}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => void acceptNearbyRequest(request.endpointId)} style={styles.accept}><Text style={styles.acceptText}>{text.permission}</Text></Pressable></View>
          </View>)}
        </SsaCard> : null}

        <SsaCard>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{text.nearbyPhones}</Text><Pressable accessibilityRole="button" onPress={() => router.push("/network")}><Text style={styles.link}>{text.viewNetwork}</Text></Pressable></View>
          {peers.length === 0 ? <Text style={styles.emptyBody}>{text.noKnownPhones}</Text> : peers.slice(0, 3).map((peer) => <PeerRow key={peer.peerId} peer={peer} onPress={() => router.push({ pathname: "/chat/[peerId]", params: { peerId: peer.peerId } })} />)}
        </SsaCard>

        <Pressable accessibilityRole="link" onPress={() => router.push("/onboarding")}><Text style={styles.learnMore}>{text.learnMore}</Text></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function makeStyles(colors: SsaColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30, gap: 16 },
    header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    eyebrow: { color: colors.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
    title: { color: colors.foreground, fontSize: 25, fontWeight: "900", marginTop: 5 },
    tagline: { color: colors.primary, fontSize: 12, fontWeight: "700", marginTop: 4 },
    settingsIcon: { width: 42, height: 42, borderRadius: 21, borderColor: colors.border, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    settingsIconText: { color: colors.muted, fontSize: 19 },
    heroCard: { backgroundColor: colors.surfaceRaised, gap: 12 },
    heroTitle: { color: colors.foreground, fontSize: 23, lineHeight: 29, fontWeight: "900", marginTop: 3 },
    heroBody: { color: colors.muted, fontSize: 13, lineHeight: 20 },
    hint: { color: colors.faint, fontSize: 10, lineHeight: 15 },
    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    sectionTitle: { color: colors.foreground, fontSize: 16, fontWeight: "900" },
    sectionMeta: { color: colors.faint, fontSize: 11 },
    link: { color: colors.primary, fontSize: 12, fontWeight: "800" },
    actionGrid: { flexDirection: "row", gap: 10 },
    actionCard: { flex: 1, minHeight: 122, borderRadius: 18, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface, padding: 14, justifyContent: "space-between" },
    actionPrimary: { backgroundColor: colors.criticalSurface, borderColor: colors.danger },
    actionIcon: { color: colors.danger, fontSize: 26, fontWeight: "900" },
    actionIconSecondary: { color: colors.primary, fontSize: 24, fontWeight: "900" },
    actionTitle: { color: colors.foreground, fontSize: 14, fontWeight: "900" },
    actionSubtitle: { color: colors.muted, fontSize: 10, lineHeight: 14 },
    typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
    recentList: { marginTop: 10, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
    recentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
    recentMark: { width: 5, height: 34, borderRadius: 3, marginRight: 10 },
    recentCopy: { flex: 1, gap: 3 },
    recentTitle: { color: colors.foreground, fontSize: 12, fontWeight: "800" },
    recentMeta: { color: colors.faint, fontSize: 10 },
    recentChevron: { color: colors.faint, fontSize: 22, marginLeft: 8 },
    recentEmpty: { color: colors.faint, fontSize: 11, marginTop: 9 },
    requestCard: { backgroundColor: colors.criticalSurface, borderColor: colors.danger },
    requestTitle: { color: colors.foreground, fontSize: 15, fontWeight: "900" },
    requestBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 5 },
    requestRow: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 10, marginTop: 3, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    requestName: { color: colors.foreground, fontSize: 13, fontWeight: "700", flex: 1 },
    requestActions: { flexDirection: "row", gap: 8 },
    reject: { borderColor: colors.border, borderWidth: 1, borderRadius: 9, minHeight: 34, paddingHorizontal: 12, justifyContent: "center" },
    rejectText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
    accept: { backgroundColor: colors.success, borderRadius: 9, minHeight: 34, paddingHorizontal: 12, justifyContent: "center" },
    acceptText: { color: colors.primaryInk, fontSize: 12, fontWeight: "900" },
    emptyBody: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    learnMore: { color: colors.primary, textAlign: "center", fontSize: 12, fontWeight: "800", paddingVertical: 4 },
    pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  });
}
