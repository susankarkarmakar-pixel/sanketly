import { describe, expect, it } from "vitest";
import {
  DeduplicationCache,
  canRelay,
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
      ciphertext: "sealed-content",
      now: 1000,
      ttlMs: 5000,
      hopLimit: 3,
    });

    expect(decodePacket(encodePacket(packet))).toEqual(packet);
  });

  it("increments the hop count and refuses packets at the relay limit", () => {
    const packet = createMessagePacket({
      packetId: "packet-1",
      messageId: "message-1",
      senderId: "alice",
      recipientId: "bob",
      ciphertext: "sealed-content",
      hopLimit: 1,
    });

    const relayed = relayPacket(packet);
    expect(relayed.hopCount).toBe(1);
    expect(canRelay(relayed)).toBe(false);
    expect(() => relayPacket(relayed)).toThrow("Packet cannot be relayed");
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
});
