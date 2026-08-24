import { describe, expect, it } from "vitest";
import {
  DeduplicationCache,
  canRelay,
  nextRelayAttemptAt,
  selectNextHop,
  shouldRelayPacket,
  chunkBleFrame,
  reassembleBleChunks,
  createMessagePacket,
  decodePacket,
  encodePacket,
  relayPacket,
} from "./index";

describe("Sanketly mesh protocol", () => {
  it("round-trips a message packet through the framed codec", () => {
    const packet = createMessagePacket({
      packetId: "packet-1",
      messageId: "message-1",
      senderId: "alice",
      recipientId: "bob",
      conversationId: "dm:bob",
      ciphertext: "sealed-content",
      signature: "signature",
      cryptoVersion: 1,
      senderSigningPublicKey: "alice-signing-key",
      senderEncryptionPublicKey: "alice-encryption-key",
      now: 1000,
      ttlMs: 5000,
      hopLimit: 3,
    });

    expect(decodePacket(encodePacket(packet))).toEqual(packet);
  });

  it("selects the destination first and avoids the previous hop for relays", () => {
    const packet = createMessagePacket({
      packetId: "packet-route",
      messageId: "message-route",
      senderId: "alice",
      recipientId: "dina",
      conversationId: "dm:dina",
      ciphertext: "sealed-content",
      signature: "signature",
      cryptoVersion: 1,
      senderSigningPublicKey: "alice-signing-key",
      senderEncryptionPublicKey: "alice-encryption-key",
      hopLimit: 3,
    });
    const peers = [
      { peerId: "bob", linkId: "link-b", lastSeenAt: 1000, verified: true, connectionState: "connected" as const, transport: "nearby" as const },
      { peerId: "dina", linkId: "link-d", lastSeenAt: 1000, verified: true, connectionState: "connected" as const, transport: "nearby" as const },
      { peerId: "alice", linkId: "link-a", lastSeenAt: 1000, verified: true, connectionState: "connected" as const, transport: "nearby" as const },
    ];
    expect(selectNextHop(packet, peers, { localPeerId: "alice", now: 1000 })?.peerId).toBe("dina");
    const relayed = relayPacket(packet, "bob", 1000);
    expect(selectNextHop(relayed, peers, { localPeerId: "charlie", excludeLinkId: "link-b", now: 1000 })?.peerId).toBe("dina");
    expect(shouldRelayPacket(relayed, "charlie", 1000)).toBe(true);
  });

  it("requires authenticated relay peers for encrypted messages", () => {
    const packet = createMessagePacket({
      packetId: "packet-auth-route",
      messageId: "message-auth-route",
      senderId: "alice",
      recipientId: "dina",
      conversationId: "dm:dina",
      ciphertext: "sealed-content",
      signature: "signature",
      cryptoVersion: 1,
      senderSigningPublicKey: "alice-signing-key",
      senderEncryptionPublicKey: "alice-encryption-key",
      hopLimit: 3,
    });
    const peer = { peerId: "relay", linkId: "link-r", lastSeenAt: 1000, verified: false, connectionState: "connected" as const, transport: "nearby" as const };
    expect(selectNextHop(packet, [peer], { localPeerId: "alice", now: 1000 })).toBeNull();
    expect(nextRelayAttemptAt(0, 1000)).toBe(3000);
    expect(nextRelayAttemptAt(3, 1000)).toBe(17000);
  });

  it("increments the hop count and refuses packets at the relay limit", () => {
    const packet = createMessagePacket({
      packetId: "packet-1",
      messageId: "message-1",
      senderId: "alice",
      recipientId: "bob",
      conversationId: "dm:bob",
      ciphertext: "sealed-content",
      signature: "signature",
      cryptoVersion: 1,
      senderSigningPublicKey: "alice-signing-key",
      senderEncryptionPublicKey: "alice-encryption-key",
      hopLimit: 1,
    });

    const relayed = relayPacket(packet, "relay-1", 1000);
    expect(relayed.hopCount).toBe(1);
    expect(canRelay(relayed)).toBe(false);
    expect(() => relayPacket(relayed, "relay-2", 1000)).toThrow("Packet cannot be relayed");
  });

  it("allows an exhausted packet only to reach a directly connected verified recipient", () => {
    const packet = createMessagePacket({
      packetId: "packet-final-hop",
      messageId: "message-final-hop",
      senderId: "alice",
      recipientId: "dina",
      conversationId: "dm:dina",
      ciphertext: "sealed-content",
      signature: "signature",
      cryptoVersion: 1,
      senderSigningPublicKey: "alice-signing-key",
      senderEncryptionPublicKey: "alice-encryption-key",
      hopLimit: 1,
    });
    const exhausted = { ...packet, hopCount: packet.hopLimit };
    const destination = { peerId: "dina", linkId: "link-d", lastSeenAt: 1000, verified: true, connectionState: "connected" as const, transport: "nearby" as const };
    const relay = { peerId: "charlie", linkId: "link-c", lastSeenAt: 1000, verified: true, connectionState: "connected" as const, transport: "nearby" as const };

    expect(selectNextHop(exhausted, [destination, relay], { localPeerId: "bob", now: 1000 })?.peerId).toBe("dina");
    expect(selectNextHop(exhausted, [relay], { localPeerId: "bob", now: 1000 })).toBeNull();
    expect(shouldRelayPacket(exhausted, "bob", 1000)).toBe(false);
  });

  it("suppresses duplicate packet identifiers and evicts old entries", () => {
    const cache = new DeduplicationCache(2, 100);
    expect(cache.remember("a", 0)).toBe(true);
    expect(cache.remember("a", 0)).toBe(false);
    expect(cache.remember("b", 0)).toBe(true);
    expect(cache.remember("c", 0)).toBe(true);
    expect(cache.has("a", 0)).toBe(false);
    expect(cache.has("c", 0)).toBe(true);
    expect(cache.has("c", 101)).toBe(false);
  });

  it("rejects an invalid frame header", () => {
    expect(() => decodePacket(new Uint8Array([0, 0, 1, 123]))).toThrow("Invalid Sanketly frame header");
  });

  it("chunks and reassembles a BLE frame independent of arrival order", () => {
    const frame = new Uint8Array(Array.from({ length: 500 }, (_, index) => index % 251));
    const chunks = chunkBleFrame(frame, 42);
    expect(chunks.length).toBe(4);
    expect(reassembleBleChunks([chunks[2], chunks[0], chunks[3], chunks[1]])).toEqual(frame);
    expect(reassembleBleChunks([chunks[0], chunks[0], chunks[1], chunks[2]])).toBeNull();
  });

  it("rejects oversized BLE frames", () => {
    expect(() => chunkBleFrame(new Uint8Array(4097), 1)).toThrow("Invalid BLE frame length");
  });
});
