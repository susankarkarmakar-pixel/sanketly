export const SETTINGS_SECTIONS = {
  language: "ভাষা",
  emergencyPersistence: "Emergency persistence",
  privacy: "Privacy",
  device: "এই ডিভাইস",
} as const;

export const STORAGE_BOUNDARY = "এই prototype AsyncStorage-এ alert ও relay event রাখে; production-এ encrypted SQLite/Room-compatible persistence এবং migration দরকার।";
