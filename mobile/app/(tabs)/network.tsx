import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PeerRow, SsaButton, SsaCard, StatusPill } from "@/components/ssa/ssa-ui";
import { useSsaTheme, type SsaColors } from "@/lib/ssa-theme";
import { useSanketly } from "@/lib/sanketly-provider";
import { isMeshActive, transportLabel, verifiedPeerCount } from "@/features/network/network-utils";

export default function NetworkScreen() {
  const { meshStatus, peers, pendingNearbyRequests, startMesh, stopMesh, acceptNearbyRequest, rejectNearbyRequest, openBatterySettings } = useSanketly();
  const { colors, text, language } = useSsaTheme();
  const styles = makeStyles(colors);
  const active = isMeshActive(meshStatus);
  const verified = verifiedPeerCount(peers);
  return <ScreenContainer edges={["top", "left", "right", "bottom"]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>SSA / NETWORK</Text><Text style={styles.title}>{text.network}</Text><Text style={styles.subtitle}>{language === "bn" ? "শুধু কাছাকাছি সেতু ও যাচাই করা পরিচয়" : language === "hi" ? "केवल नज़दीकी पुल और सत्यापित पहचान" : "Nearby bridges and verified identities only"}</Text></View><Text onPress={() => router.back()} style={styles.back}>{text.back}</Text></View>
    <SsaCard style={styles.statusCard}><StatusPill state={meshStatus.state} detail={meshStatus.detail} /><Text style={styles.statusTitle}>{active ? (language === "bn" ? "কাছের সংযোগ চলছে" : language === "hi" ? "नज़दीकी कनेक्शन चल रहा है" : "Nearby connection is active") : (language === "bn" ? "কাছের সংযোগ বন্ধ" : language === "hi" ? "नज़दीकी कनेक्शन बंद है" : "Nearby connection is stopped")}</Text><Text style={styles.statusBody}>{language === "bn" ? "Android-এ Google Nearby Connections P2P_CLUSTER প্রাথমিক পরিবহন। raw BLE fallback আলাদা পরীক্ষামূলক module হিসেবে রাখা আছে।" : language === "hi" ? "Android पर Google Nearby Connections P2P_CLUSTER मुख्य transport है। raw BLE fallback अलग प्रयोगात्मक module है।" : "Google Nearby Connections P2P_CLUSTER is the primary Android transport. The raw BLE fallback remains experimental."}</Text><SsaButton label={active ? text.stop : text.start} onPress={() => void (active ? stopMesh() : startMesh())} /></SsaCard>
    <SsaCard><View style={styles.sectionHeader}><Text style={styles.section}>{language === "bn" ? "পরিচিত ফোন" : language === "hi" ? "परिचित फ़ोन" : "Known phones"}</Text><Text style={styles.count}>{language === "bn" ? `${verified}টি যাচাই · ${peers.length}টি মোট` : language === "hi" ? `${verified} सत्यापित · ${peers.length} कुल` : `${verified} verified · ${peers.length} total`}</Text></View>{peers.length === 0 ? <Text style={styles.empty}>{text.noKnownPhones}</Text> : peers.map((peer) => <View key={peer.peerId}><PeerRow peer={peer} /><Text style={styles.transport}>{transportLabel(peer)}</Text></View>)}</SsaCard>
    {pendingNearbyRequests.length > 0 ? <SsaCard style={styles.requestCard}><Text style={styles.section}>{language === "bn" ? "অনুমতির অপেক্ষায়" : language === "hi" ? "अनुमति लंबित" : "Waiting for approval"}</Text>{pendingNearbyRequests.map((request) => <View key={request.endpointId} style={styles.requestRow}><View style={styles.requestCopy}><Text style={styles.peerName}>{request.name || "SSA device"}</Text><Text style={styles.peerMeta}>{language === "bn" ? "নিরাপত্তা কোড" : language === "hi" ? "सुरक्षा कोड" : "Security code"}: {request.authenticationToken}</Text></View><View style={styles.requestActions}><SsaButton label={text.no} variant="secondary" onPress={() => void rejectNearbyRequest(request.endpointId)} style={styles.smallButton} /><SsaButton label={text.permission} onPress={() => void acceptNearbyRequest(request.endpointId)} style={styles.smallButton} /></View></View>)}</SsaCard> : null}
    <SsaCard><Text style={styles.section}>{text.emergencyPersistence}</Text><Text style={styles.body}>{language === "bn" ? "Foreground notification এবং battery settings সক্রিয় রাখলে Android process recovery-এর সুযোগ বাড়ে। এটি force-stop বা OEM battery policy অতিক্রম করার নিশ্চয়তা নয়।" : language === "hi" ? "Foreground notification और battery settings चालू रखने से Android process recovery की संभावना बढ़ती है। यह force-stop या OEM policy को पार करने की गारंटी नहीं है।" : "Keeping the foreground notification and battery settings active improves the chance of Android process recovery. It cannot defeat force-stop or OEM policy."}</Text><SsaButton label={text.batterySettings} variant="secondary" onPress={() => void openBatterySettings()} /></SsaCard>
  </ScrollView></ScreenContainer>;
}

function makeStyles(colors: SsaColors) {
  return StyleSheet.create({
    content: { padding: 18, gap: 13, paddingBottom: 30 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    eyebrow: { color: colors.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
    title: { color: colors.foreground, fontSize: 25, fontWeight: "900", marginTop: 5 },
    subtitle: { color: colors.muted, fontSize: 12, marginTop: 5, maxWidth: 260 },
    back: { color: colors.primary, fontSize: 13, fontWeight: "800" },
    statusCard: { gap: 12, backgroundColor: colors.surfaceRaised },
    statusTitle: { color: colors.foreground, fontSize: 18, fontWeight: "900" },
    statusBody: { color: colors.muted, fontSize: 12, lineHeight: 19 },
    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
    section: { color: colors.foreground, fontSize: 14, fontWeight: "900" },
    count: { color: colors.primary, fontSize: 12, fontWeight: "800" },
    empty: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 10 },
    requestCard: { borderColor: colors.warning, backgroundColor: colors.surfaceRaised },
    requestRow: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 10, marginTop: 10, flexDirection: "row", alignItems: "center" },
    requestCopy: { flex: 1 },
    peerName: { color: colors.foreground, fontSize: 13, fontWeight: "800" },
    peerMeta: { color: colors.faint, fontSize: 10, marginTop: 3 },
    requestActions: { flexDirection: "row", gap: 7, marginLeft: 8 },
    smallButton: { minHeight: 36, paddingHorizontal: 10 },
    transport: { color: colors.primary, fontSize: 10, fontWeight: "800", marginLeft: 52, marginTop: -8, marginBottom: 3 },
    body: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 8, marginBottom: 12 },
  });
}
