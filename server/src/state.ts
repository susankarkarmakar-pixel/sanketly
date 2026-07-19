export interface User {
  username: string;
  ed25519PublicKey: string;
  x25519PublicKey: string;
}

// In-memory stores
export const users = new Map<string, User>();
export const challenges = new Map<string, string>(); // username -> challenge
export const sessions = new Map<string, string>(); // sessionId -> username
