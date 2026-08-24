export type ReadinessLanguage = "bn" | "en" | "hi";
export type ReadinessCopyStatus = "checking" | "ready" | "needs-attention" | "blocked" | "not-required";

export function readinessCopy(status: ReadinessCopyStatus, language: ReadinessLanguage): string {
  if (status === "ready") return language === "bn" ? "প্রস্তুত" : language === "hi" ? "तैयार" : "Ready";
  if (status === "blocked") return language === "bn" ? "সমস্যা আছে" : language === "hi" ? "समस्या" : "Blocked";
  if (status === "needs-attention") return language === "bn" ? "দেখুন" : language === "hi" ? "ध्यान दें" : "Needs attention";
  if (status === "not-required") return language === "bn" ? "প্রয়োজন নেই" : language === "hi" ? "ज़रूरी नहीं" : "Not required";
  return language === "bn" ? "পরীক্ষা হচ্ছে" : language === "hi" ? "जाँच हो रही है" : "Checking";
}
