import { NativeEventEmitter, NativeModules, Platform } from "react-native";

export interface NativeMeshPeer {
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
  | { type: "frame"; bytes: number[] };

interface NativeMeshModule {
  start(): Promise<void>;
  stop(): Promise<void>;
  sendFrame(peerId: string, bytes: number[]): Promise<void>;
}

const nativeModule = NativeModules.SanketlyMesh as NativeMeshModule | undefined;
const emitter = nativeModule ? new NativeEventEmitter(NativeModules.SanketlyMesh) : undefined;

export const MeshNative = {
  isAvailable: Platform.OS !== "web" && Boolean(nativeModule),

  async start(): Promise<void> {
    if (!nativeModule) throw new Error("Sanketly mesh native module is not installed");
    await nativeModule.start();
  },

  async stop(): Promise<void> {
    if (!nativeModule) return;
    await nativeModule.stop();
  },

  async sendFrame(peerId: string, bytes: number[]): Promise<void> {
    if (!nativeModule) throw new Error("Sanketly mesh native module is not installed");
    if (bytes.length === 0) throw new Error("Cannot send an empty frame");
    await nativeModule.sendFrame(peerId, bytes);
  },

  subscribe(listener: (event: NativeMeshEvent) => void): () => void {
    if (!emitter) return () => undefined;
    const subscription = emitter.addListener("SanketlyMeshEvent", listener);
    return () => subscription.remove();
  },
};
