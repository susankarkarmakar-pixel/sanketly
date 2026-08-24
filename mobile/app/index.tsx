import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useSanketly } from "@/lib/sanketly-provider";

function statusLabel(state: string): string {
  if (state === "ready") return "Nearby discovery active";
  if (state === "starting") return "Waiting for nearby approval…";
  if (state === "error") return "Nearby transport needs attention";
  return "SSA is offline";
}

export default function HomeScreen() {
  const {
    peerId,
    meshStatus,
    peers,
    pendingNearbyRequests,
    startMesh,
    stopMesh,
    acceptNearbyRequest,
    rejectNearbyRequest,
    openBatterySettings,
  } = useSanketly();
  const meshActive = meshStatus.state === "ready" || meshStatus.state === "starting";

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>SSA / OFFLINE ALERT NETWORK</Text>
            <Text style={styles.title}>Sanket Setu Alert</Text>
          </View>
          <View style={[styles.statusDot, meshActive ? styles.statusDotActive : styles.statusDotIdle]} />
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>JOKHON SHOB BONDHO, SETU KHOLA THAKE</Text>
          <Text style={styles.heroTitle}>Messages that find a way.</Text>
          <Text style={styles.heroBody}>
            SSA sends emergency alerts through nearby phones first, then keeps them queued until a connected bridge is available.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={meshActive ? stopMesh : startMesh}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>{meshActive ? "Stop nearby discovery" : "Start nearby discovery"}</Text>
          </Pressable>
          <Text style={styles.statusText}>{statusLabel(meshStatus.state)}{meshStatus.detail ? ` · ${meshStatus.detail}` : ""}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void openBatterySettings()}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
          >
            <Text style={styles.settingsButtonText}>Protect emergency mode from battery saving</Text>
          </Pressable>
        </View>

        {pendingNearbyRequests.length > 0 && (
          <View style={styles.requestCard}>
            <Text style={styles.requestTitle}>Nearby phone wants to connect</Text>
            <Text style={styles.requestBody}>Accept only when the phone is physically nearby and belongs to your SSA pilot group.</Text>
            {pendingNearbyRequests.map((request) => (
              <View key={request.endpointId} style={styles.requestRow}>
                <Text style={styles.requestName}>{request.name || "SSA device"}</Text>
                <View style={styles.requestActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void rejectNearbyRequest(request.endpointId)}
                    style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void acceptNearbyRequest(request.endpointId)}
                    style={({ pressed }) => [styles.acceptButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby peers</Text>
          <Text style={styles.sectionCount}>{peers.length}</Text>
        </View>

        {peers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No nearby peers yet</Text>
            <Text style={styles.emptyBody}>
              Install the SSA development build on two Android phones, enable Nearby permissions, and start discovery on both phones.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/chat/[peerId]", params: { peerId: "development-peer" } })}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Open test conversation</Text>
            </Pressable>
          </View>
        ) : (
          peers.map((peer) => (
            <Pressable
              key={peer.peerId}
              onPress={() => router.push({ pathname: "/chat/[peerId]", params: { peerId: peer.peerId } })}
              style={({ pressed }) => [styles.peerCard, pressed && styles.pressed]}
            >
              <View style={styles.peerAvatar}><Text style={styles.peerAvatarText}>{(peer.displayName ?? "P").slice(0, 1).toUpperCase()}</Text></View>
              <View style={styles.peerCopy}>
                <Text style={styles.peerName}>{peer.displayName ?? "Nearby peer"}</Text>
                <Text style={styles.peerMeta}>{peer.connectionState} · {peer.verified ? "verified" : "awaiting identity"}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}

        <View style={styles.identityFooter}>
          <Text style={styles.identityLabel}>LOCAL DEVICE ID</Text>
          <Text style={styles.identityValue}>{peerId ? `${peerId.slice(0, 18)}…` : "Loading secure identity…"}</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 22, gap: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: "#7F8AA5", fontSize: 11, fontWeight: "700", letterSpacing: 1.3 },
  title: { color: "#F6F7FB", fontSize: 30, fontWeight: "800", marginTop: 6 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusDotActive: { backgroundColor: "#5EE1A3" },
  statusDotIdle: { backgroundColor: "#59647D" },
  heroCard: { backgroundColor: "#171E35", borderColor: "#2B3655", borderWidth: 1, borderRadius: 24, padding: 20, gap: 11 },
  heroKicker: { color: "#89A9FF", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: "#FFFFFF", fontSize: 25, fontWeight: "800", lineHeight: 31 },
  heroBody: { color: "#B6C0D8", fontSize: 14, lineHeight: 21 },
  primaryButton: { backgroundColor: "#89A9FF", borderRadius: 14, minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 5 },
  primaryButtonText: { color: "#10162A", fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  statusText: { color: "#7F8AA5", fontSize: 11, lineHeight: 16 },
  settingsButton: { borderColor: "#3B4A73", borderWidth: 1, borderRadius: 10, minHeight: 38, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  settingsButtonText: { color: "#AFC2FF", fontSize: 11, fontWeight: "700", textAlign: "center" },
  requestCard: { backgroundColor: "#201E31", borderColor: "#51456F", borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  requestTitle: { color: "#F4EEFF", fontSize: 16, fontWeight: "800" },
  requestBody: { color: "#BDB2D5", fontSize: 12, lineHeight: 18 },
  requestRow: { borderTopColor: "#3B3350", borderTopWidth: 1, paddingTop: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  requestName: { color: "#E8DFFF", fontSize: 13, fontWeight: "700", flex: 1 },
  requestActions: { flexDirection: "row", gap: 8 },
  rejectButton: { borderColor: "#635978", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 36, alignItems: "center", justifyContent: "center" },
  rejectButtonText: { color: "#CFC5E0", fontSize: 12, fontWeight: "700" },
  acceptButton: { backgroundColor: "#5EE1A3", borderRadius: 10, paddingHorizontal: 14, minHeight: 36, alignItems: "center", justifyContent: "center" },
  acceptButtonText: { color: "#10251E", fontSize: 12, fontWeight: "800" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  sectionTitle: { color: "#F6F7FB", fontSize: 17, fontWeight: "800" },
  sectionCount: { color: "#7F8AA5", fontSize: 14, fontWeight: "700" },
  emptyCard: { borderColor: "#28334F", borderWidth: 1, borderRadius: 18, padding: 18, gap: 10 },
  emptyTitle: { color: "#E9ECF5", fontSize: 16, fontWeight: "700" },
  emptyBody: { color: "#8F9AB5", fontSize: 13, lineHeight: 20 },
  secondaryButton: { borderColor: "#51638E", borderWidth: 1, borderRadius: 12, minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 3 },
  secondaryButtonText: { color: "#AFC2FF", fontSize: 13, fontWeight: "700" },
  peerCard: { borderColor: "#28334F", borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center" },
  peerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#273B69", alignItems: "center", justifyContent: "center" },
  peerAvatarText: { color: "#B9C9FF", fontSize: 17, fontWeight: "800" },
  peerCopy: { flex: 1, marginLeft: 12, gap: 3 },
  peerName: { color: "#F6F7FB", fontSize: 15, fontWeight: "700" },
  peerMeta: { color: "#8793AF", fontSize: 12 },
  chevron: { color: "#8793AF", fontSize: 28, fontWeight: "300" },
  identityFooter: { marginTop: "auto", paddingBottom: 16, gap: 4 },
  identityLabel: { color: "#687590", fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  identityValue: { color: "#99A5C0", fontSize: 12 },
});
