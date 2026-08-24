import type { AlertPriority, StructuredAlertKind } from "@sanketly/domain";

export const SSA_COLORS = {
  background: "#0B1020",
  surface: "#151D34",
  surfaceRaised: "#1B2744",
  border: "#2B3859",
  foreground: "#F6F7FB",
  muted: "#AAB5CF",
  faint: "#74809D",
  primary: "#8EA9FF",
  primaryInk: "#10162A",
  success: "#5EE1A3",
  warning: "#FFC56E",
  danger: "#FF7F86",
  criticalSurface: "#321F32",
} as const;

export const ALERT_KIND_LABELS: Record<StructuredAlertKind, { bn: string; en: string; color: string }> = {
  flood: { bn: "বন্যা", en: "Flood", color: "#6EA8FF" },
  fire: { bn: "আগুন", en: "Fire", color: "#FF8A65" },
  medical: { bn: "চিকিৎসা", en: "Medical", color: "#72D6B1" },
  missing_person: { bn: "নিখোঁজ ব্যক্তি", en: "Missing person", color: "#C39BFF" },
  infrastructure: { bn: "রাস্তা / বিদ্যুৎ", en: "Infrastructure", color: "#FFC56E" },
  sos: { bn: "জরুরি সাহায্য", en: "SOS", color: "#FF7F86" },
};

export const ALERT_PRIORITY_LABELS: Record<AlertPriority, { bn: string; en: string; color: string }> = {
  critical: { bn: "অতি জরুরি", en: "Critical", color: SSA_COLORS.danger },
  high: { bn: "জরুরি", en: "High", color: SSA_COLORS.warning },
  normal: { bn: "সাধারণ", en: "Normal", color: SSA_COLORS.success },
};

export const SSA_COPY = {
  appName: "Sanket Setu Alert",
  tagline: "যখন সব বন্ধ, সেতু খোলা থাকে",
  dashboard: "জরুরি ড্যাশবোর্ড",
  start: "কাছের ফোন খুঁজুন",
  stop: "নেটওয়ার্ক থামান",
  sendAlert: "জরুরি বার্তা পাঠান",
  alerts: "আমার সতর্কবার্তা",
  network: "নেটওয়ার্ক",
  settings: "সেটিংস",
  onboarding: "SSA কীভাবে কাজ করে",
} as const;

export const ALERT_KIND_ORDER: StructuredAlertKind[] = ["flood", "fire", "medical", "missing_person", "infrastructure", "sos"];
