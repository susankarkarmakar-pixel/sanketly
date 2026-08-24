import type { MeshPeer, TransportStatus } from "@sanketly/protocol";

export function isMeshActive(status: TransportStatus): boolean {
  return status.state === "ready" || status.state === "starting";
}

export function transportLabel(peer: MeshPeer): string {
  if (peer.transport === "nearby") return "Google Nearby";
  if (peer.transport === "ble") return "BLE fallback";
  return "Internet fallback";
}

export function verifiedPeerCount(peers: MeshPeer[]): number {
  return peers.filter((peer) => peer.verified && peer.connectionState === "connected").length;
}
