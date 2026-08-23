import { requireNativeModule } from "expo";
import { Platform } from "react-native";

export interface NativeMeshPeer {
  /** Stable native link identifier; it may be provisional before identity announcement. */
  linkId: string;
  peerId: string;
  displayName?: string;
  encryptionPublicKey?: string;
  signingPublicKey?: string;
  lastSeenAt: number;
  verified: boolean;
  connectionState: "discovered" | "connecting" | "connected" | "unavailable";
}

export type NativeMeshEvent =
  | { type: "status"; state: "starting" | "ready" | "stopped" | "error"; detail?: string }
  | { type: "peer"; peer: NativeMeshPeer }
  | { type: "frame"; linkId: string; bytes: number[] };

interface NativeMeshModule {
  addListener(eventName: "SanketlyMeshEvent", listener: (event: NativeMeshEvent) => void): { remove(): void };
  removeListeners(count: number): void;
  start(announceBytes: number[]): Promise<void>;
  stop(): Promise<void>;
  sendFrame(linkId: string, bytes: number[]): Promise<void>;
}

let nativeModule: NativeMeshModule | undefined;
if (Platform.OS !== "web") {
  try {
    nativeModule = requireNativeModule<NativeMeshModule>("SanketlyMesh");
  } catch {
    nativeModule = undefined;
  }
}

export const MeshNative = {
  isAvailable: Platform.OS !== "web" && Boolean(nativeModule),

  async start(announceBytes: number[]): Promise<void> {
    if (!nativeModule) throw new Error("Sanketly mesh native module is not installed");
    if (announceBytes.length === 0) throw new Error("A local announce frame is required");
    await nativeModule.start(announceBytes);
  },

  async stop(): Promise<void> {
    if (!nativeModule) return;
    await nativeModule.stop();
  },

  async sendFrame(linkId: string, bytes: number[]): Promise<void> {
    if (!nativeModule) throw new Error("Sanketly mesh native module is not installed");
    if (!linkId) throw new Error("A native link identifier is required");
    if (bytes.length === 0) throw new Error("Cannot send an empty frame");
    await nativeModule.sendFrame(linkId, bytes);
  },

  subscribe(listener: (event: NativeMeshEvent) => void): () => void {
    if (!nativeModule) return () => undefined;
    const subscription = nativeModule.addListener("SanketlyMeshEvent", listener);
    return () => subscription.remove();
  },
};
