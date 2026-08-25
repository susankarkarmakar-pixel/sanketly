# External references for SSA production readiness

1. Android Developers, “Foreground services overview,” https://developer.android.com/develop/background-work/services/fgs
   - Foreground services are user-visible operations and must show a status-bar notification.
   - Android’s guidance covers declarations, permissions, launch restrictions, service types, timeout behavior, and troubleshooting.
   - Page last updated 2026-08-14 UTC when retrieved.

2. Android Developers, “Notification runtime permission,” https://developer.android.com/develop/ui/compose/notifications/notification-permission
   - Android 13/API 33+ uses the POST_NOTIFICATIONS runtime permission for non-exempt notifications, including foreground-service notifications.
   - Apps must handle allow, deny, and dismissed states; denial blocks normal notification channels but does not prevent launching a foreground service.
   - Android recommends explaining notification value in context and checking whether notifications are enabled.
   - Page last updated 2026-08-14 UTC when retrieved.

3. Android Developers, “Sign your app,” https://developer.android.com/studio/publish/app-signing
   - Android requires installed APKs to be digitally signed.
   - For Play distribution, use an upload key and Play App Signing; keep private signing keys protected.
   - Play App Signing separates the upload key from the app-signing key and supports key management/recovery.
   - Page retrieved 2026-08-25.

4. Google Play Console Help, “Provide information for Google Play’s Data safety section,” https://support.google.com/googleplay/android-developer/answer/10787469?hl=en
   - Published apps must complete accurate Data safety declarations and provide a privacy-policy link, including disclosures for third-party SDK behavior.
   - Developers are responsible for accurate collection, sharing, encryption, and deletion declarations.
   - Page retrieved 2026-08-25.
