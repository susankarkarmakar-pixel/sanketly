import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PeerRow, SsaButton, SsaCard, StatusPill } from "@/components/ssa/ssa-ui";
import { SSA_COLORS, SSA_COPY } from "@/constants/ssa";
import { useSanketly } from "@/lib/sanketly-provider";
import { isMeshActive, transportLabel, verifiedPeerCount } from "@/features/network/network-utils";

export default function NetworkScreen() {
  const { meshStatus, peers, pendingNearbyRequests, startMesh, stopMesh, acceptNearbyRequest, rejectNearbyRequest, openBatterySettings } = useSanketly();
  const active = isMeshActive(meshStatus);
  return <ScreenContainer edges={["top", "left", "right", "bottom"]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>SSA / NETWORK</Text><Text style={styles.title}>{SSA_COPY.network}</Text><Text style={styles.subtitle}>শুধু কাছাকাছি সেতু ও যাচাই করা পরিচয়</Text></View><Text onPress={() => router.back()} style={styles.back}>ফিরুন</Text></View>
    <SsaCard style={styles.statusCard}><StatusPill state={meshStatus.state} detail={meshStatus.detail} /><Text style={styles.statusTitle}>{active ? "Nearby transport চলছে" : "Nearby transport বন্ধ"}</Text><Text style={styles.statusBody}>Android-এ Google Nearby Connections P2P_CLUSTER primary transport। raw BLE fallback আলাদা পরীক্ষামূলক module হিসেবে রাখা আছে।</Text><SsaButton label={active ? SSA_COPY.stop : SSA_COPY.start} onPress={() => void (active ? stopMesh() : startMesh())} /></SsaCard>
    <SsaCard><View style={styles.sectionHeader}><Text style={styles.section}>পরিচিত ফোন</Text><Text style={styles.count}>{verifiedPeerCount(peers)} verified / {peers.length} total</Text></View>{peers.length === 0 ? <Text style={styles.empty}>এখনও কোনো peer নেই। দুই বা ততোধিক Android ফোনে SSA development build চালিয়ে Nearby discovery শুরু করুন।</Text> : peers.map((peer) => <View key={peer.peerId}><PeerRow peer={peer} /><Text style={styles.transport}>{transportLabel(peer)}</Text></View>)}</SsaCard>
    {pendingNearbyRequests.length > 0 ? <SsaCard style={styles.requestCard}><Text style={styles.section}>অনুমতির অপেক্ষায়</Text>{pendingNearbyRequests.map((request) => <View key={request.endpointId} style={styles.requestRow}><View style={styles.requestCopy}><Text style={styles.peerName}>{request.name || "SSA device"}</Text><Text style={styles.peerMeta}>Authentication token: {request.authenticationToken}</Text></View><View style={styles.requestActions}><SsaButton label="না" variant="secondary" onPress={() => void rejectNearbyRequest(request.endpointId)} style={styles.smallButton} /><SsaButton label="হ্যাঁ" onPress={() => void acceptNearbyRequest(request.endpointId)} style={styles.smallButton} /></View></View>)}</SsaCard> : null}
    <SsaCard><Text style={styles.section}>Emergency mode</Text><Text style={styles.body}>Foreground notification এবং battery settings সক্রিয় রাখলে Android process recovery-এর সুযোগ বাড়ে। এটি force-stop বা OEM battery policy অতিক্রম করার নিশ্চয়তা নয়।</Text><SsaButton label="Battery settings খুলুন" variant="secondary" onPress={() => void openBatterySettings()} /></SsaCard>
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 13, paddingBottom: 30 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { color: SSA_COLORS.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: SSA_COLORS.foreground, fontSize: 25, fontWeight: "900", marginTop: 5 },
  subtitle: { color: SSA_COLORS.muted, fontSize: 12, marginTop: 5 },
  back: { color: SSA_COLORS.primary, fontSize: 13, fontWeight: "800" },
  statusCard: { gap: 12, backgroundColor: "#17213C" },
  statusTitle: { color: SSA_COLORS.foreground, fontSize: 18, fontWeight: "900" },
  statusBody: { color: SSA_COLORS.muted, fontSize: 12, lineHeight: 19 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  section: { color: SSA_COLORS.foreground, fontSize: 14, fontWeight: "900" },
  count: { color: SSA_COLORS.primary, fontSize: 12, fontWeight: "800" },
  empty: { color: SSA_COLORS.muted, fontSize: 12, lineHeight: 19, marginTop: 10 },
  requestCard: { borderColor: "#5D4C70", backgroundColor: "#211D32" },
  requestRow: { borderTopColor: SSA_COLORS.border, borderTopWidth: 1, paddingTop: 10, marginTop: 10, flexDirection: "row", alignItems: "center" },
  requestCopy: { flex: 1 },
  peerName: { color: SSA_COLORS.foreground, fontSize: 13, fontWeight: "800" },
  peerMeta: { color: SSA_COLORS.faint, fontSize: 10, marginTop: 3 },
  requestActions: { flexDirection: "row", gap: 7, marginLeft: 8 },
  smallButton: { minHeight: 36, paddingHorizontal: 10 },
  transport: { color: SSA_COLORS.primary, fontSize: 10, fontWeight: "800", marginLeft: 52, marginTop: -8, marginBottom: 3 },
  body: { color: SSA_COLORS.muted, fontSize: 12, lineHeight: 19, marginTop: 8, marginBottom: 12 },
});
