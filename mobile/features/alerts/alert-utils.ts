import type { AlertRecord, StructuredAlert } from "@sanketly/domain";
import type { SsaLanguage } from "@/lib/ssa-theme";

export function alertSummary(alert: StructuredAlert): string {
  return `${alert.title} · ${alert.village}`;
}

export function deliveryLabel(state: AlertRecord["deliveryState"], language: SsaLanguage = "bn"): string {
  const labels: Record<SsaLanguage, Record<string, string>> = {
    bn: { delivered: "প্রাপক পেয়েছে", queued: "কিউতে আছে", relaying: "এগিয়ে যাচ্ছে", sent: "পরের সেতুতে পাঠানো হয়েছে", read: "প্রাপক দেখেছে", failed: "ব্যর্থ", expired: "মেয়াদ শেষ" },
    en: { delivered: "Recipient received", queued: "Queued", relaying: "Relaying", sent: "Sent to next hop", read: "Recipient viewed", failed: "Failed", expired: "Expired" },
    hi: { delivered: "प्रापक ने प्राप्त किया", queued: "कतार में है", relaying: "आगे भेजा जा रहा है", sent: "अगले सेतु को भेजा गया", read: "प्रापक ने देखा", failed: "विफल", expired: "समय समाप्त" },
  };
  return labels[language][state] ?? (language === "bn" ? "অবস্থা জানা নেই" : language === "hi" ? "स्थिति अज्ञात" : "Status unknown");
}

export function sortAlertRecords(records: AlertRecord[]): AlertRecord[] {
  return [...records].sort((left, right) => right.updatedAt - left.updatedAt);
}
