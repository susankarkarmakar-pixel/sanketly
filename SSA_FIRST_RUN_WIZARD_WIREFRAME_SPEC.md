# Sanket Setu Alert (SSA)
## First-Run Permission and Readiness Wizard

**Product:** Sanket Setu Alert (SSA)  
**Pilot context:** Gazole Development Block, Malda, West Bengal  
**Primary audience:** Bengali-first residents with low connectivity and mixed digital literacy  
**Secondary audience:** Volunteers who operate bridge/relay phones  
**Design principle:** Explain first, request one permission at a time, show the actual result, and never claim emergency readiness when a critical dependency is missing.

> **Core promise:** “Jokhon Shob Bondho, Setu Khola Thake.”  
> The wizard should help a person understand what SSA can attempt, prepare the phone correctly, and recover from a blocked permission without making the user feel that the app has failed.

## 1. Design goals

The wizard is a short, interruptible setup journey rather than a legal-style permission dump. Bengali is the default language, every screen uses one primary action, and the user can always choose **Continue with limited mode** when a non-critical item is unavailable. The wizard must distinguish between a **critical mesh dependency**, an **important notification dependency**, and an **optional reliability recommendation**.

The current SSA app already has an informational onboarding route, a network readiness screen, Android-version-specific permission requests, theme/localization support, and a best-effort emergency boundary.[1] [2] This design turns those existing pieces into a first-run operational flow.

## 2. Readiness model

| Readiness item | Classification | Meaning when unavailable | Wizard behavior |
|---|---|---|---|
| Nearby/Bluetooth/Wi-Fi permissions | Critical | SSA cannot start the primary nearby transport | Explain, request, then offer Android Settings recovery. |
| Nearby radio/service availability | Critical | The phone cannot currently discover or connect to peers | Show the cause and recovery instruction; do not claim mesh readiness. |
| Notification permission | Important | Received alerts may not appear in the notification tray | Request after explaining; allow limited mode with a persistent in-app warning. |
| Foreground-service permission/configuration | Critical for active mesh | Background persistence is reduced or unavailable | Show the current state and require acknowledgment of the limitation. |
| Battery optimization policy | Recommended | OEM may stop or restrict background work | Offer battery settings; allow skip with an explicit warning. |
| Verified peer available | Not a setup failure | No bridge is currently nearby | Show “Ready to search; no verified phone nearby,” not “Not ready.” |
| Internet connection | Not required | No cloud fallback | Do not block setup or show an error for being offline. |
| Legacy location permission | Conditional | Required only on supported older Android versions | Show only when the installed Android version requires it. |

The readiness result should be computed as:

```text
READY TO SEARCH = critical permissions granted + nearby transport available
READY FOR ALERT NOTIFICATIONS = READY TO SEARCH + notifications granted
BEST-EFFORT BACKGROUND = foreground service active + battery policy reviewed
```

These are capability labels, not guarantees of range, delivery, process survival, or authority response.

## 3. User flow overview

```text
First launch
   ↓
Welcome and safety boundary
   ↓
Choose language — Bengali default
   ↓
Choose role — Resident or Volunteer
   ↓
Why Nearby access is needed
   ↓
Request Nearby/Bluetooth/Wi-Fi permissions
   ├─ Granted → notification explanation
   ├─ Denied once → retry explanation or limited mode
   └─ Blocked/permanently denied → Android Settings recovery
   ↓
Why notifications are needed
   ↓
Request notification permission
   ├─ Granted → background reliability explanation
   └─ Denied → limited mode warning, continue
   ↓
Background and battery guidance
   ├─ Review settings
   └─ Skip with warning
   ↓
Live readiness check
   ├─ All critical items ready → “Ready to search”
   ├─ Recoverable issue → fix and re-check
   └─ Critical issue remains → limited mode with visible warning
   ↓
Start nearby search / Go to dashboard
```

## 4. Screen wireframes

The wireframes below are mobile portrait layouts. The top area contains a small progress label, the middle area contains one idea and one status block, and the bottom area contains the primary action plus a low-emphasis alternative.

### WF-01 — Welcome and safety boundary

```text
┌────────────────────────────────────┐
│ SSA                         1 / 7  │
│                                    │
│             [ SSA mark ]           │
│                                    │
│ Sanket Setu Alert                  │
│ যখন সব বন্ধ, সেতু খোলা থাকে        │
│                                    │
│ কাছের ফোনকে ছোট সেতু হিসেবে        │
│ ব্যবহার করে জরুরি বার্তা পাঠানোর   │
│ চেষ্টা। ইন্টারনেট সবসময় দরকার নেই। │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ এটি best-effort যোগাযোগ।       │ │
│ │ জীবনরক্ষাকারী সিদ্ধান্তে ফোন,  │ │
│ │ স্থানীয় প্রশাসন ও অন্য পথও     │ │
│ │ ব্যবহার করুন।                  │ │
│ └────────────────────────────────┘ │
│                                    │
│ [ শুরু করি ]                       │
│ পরে ড্যাশবোর্ডে যাব                │
└────────────────────────────────────┘
```

**Primary action:** `শুরু করি` / `Get started` / `शुरू करें`  
**Secondary action:** `পরে ড্যাশবোর্ডে যাব` / `Go to dashboard later` / `बाद में डैशबोर्ड`  
**Behavior:** Secondary action enters the dashboard in limited mode and leaves a setup banner at the top.

### WF-02 — Language selection

```text
┌────────────────────────────────────┐
│ SSA                         2 / 7  │
│ ভাষা / Language / भाषा             │
│                                    │
│ কোন ভাষায় SSA ব্যবহার করবেন?      │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ ✓ বাংলা                         │ │
│ │   যখন সব বন্ধ, সেতু খোলা থাকে   │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │   English                       │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │   हिन्दी                        │ │
│ └────────────────────────────────┘ │
│                                    │
│ [ এগিয়ে যান ]                     │
└────────────────────────────────────┘
```

The language choice is persisted immediately. All following permission explanations and recovery actions use the selected language. Bengali remains the default on first launch.

### WF-03 — Role selection

```text
┌────────────────────────────────────┐
│ SSA                         3 / 7  │
│ আপনার ব্যবহার / Your role          │
│                                    │
│ আপনার ফোন কীভাবে ব্যবহার করবেন?    │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ 👤 বাসিন্দা                     │ │
│ │ সহজ alert পাঠানো ও পাওয়া       │ │
│ │ technical তথ্য কম দেখাবে        │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ ⇄ স্বেচ্ছাসেবক / সেতু ফোন       │ │
│ │ relay, peer approval ও status   │ │
│ │ দেখাবে                          │ │
│ └────────────────────────────────┘ │
│                                    │
│ [ এই পছন্দ সংরক্ষণ করুন ]          │
└────────────────────────────────────┘
```

Role is a privacy and presentation preference, not an authorization to impersonate an authority. Volunteer mode must not reveal private alert plaintext beyond what the recipient is already allowed to see.

### WF-04 — Nearby permission explanation

```text
┌────────────────────────────────────┐
│ SSA                         4 / 7  │
│ কাছের ফোন খুঁজতে অনুমতি            │
│                                    │
│ SSA কাছের ফোনের সঙ্গে encrypted   │
│ connection তৈরি করতে Nearby,       │
│ Bluetooth ও Wi‑Fi access ব্যবহার   │
│ করে। এই অনুমতি ছাড়া mesh search   │
│ চলবে না।                           │
│                                    │
│        [ ফোন → ফোন ]               │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ কী হবে                         │ │
│ │ • কাছের SSA ফোন খোঁজা হবে      │ │
│ │ • আপনার alert encrypted থাকবে  │ │
│ │ • ইন্টারনেট না থাকলেও চেষ্টা    │ │
│ │   করা যাবে                     │ │
│ └────────────────────────────────┘ │
│                                    │
│ [ কাছের connection চালু করুন ]     │
│ এখন নয় — limited mode             │
└────────────────────────────────────┘
```

After the primary action, the native Android permission prompts appear. SSA must not stack multiple custom explanations before the operating-system prompt is understood.

### WF-05 — Notification permission explanation

```text
┌────────────────────────────────────┐
│ SSA                         5 / 7  │
│ জরুরি alert-এর খবর পেতে            │
│                                    │
│ অন্য ফোন থেকে alert এলে SSA        │
│ notification দেখাতে পারে।          │
│ Notification বন্ধ থাকলে alert      │
│ অ্যাপের ভিতরে থাকবে, কিন্তু tray    │
│ থেকে দেখা নাও যেতে পারে।           │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ Lock screen-এ alert-এর পুরো    │ │
│ │ লেখা দেখানো হবে না।             │ │
│ └────────────────────────────────┘ │
│                                    │
│ [ notification অনুমতি দিন ]        │
│ পরে — অ্যাপ চলবে, warning থাকবে    │
└────────────────────────────────────┘
```

If notification permission is denied, the wizard continues. The dashboard and Network tab display an actionable `Notifications off` warning until the user changes it.

### WF-06 — Background reliability guidance

```text
┌────────────────────────────────────┐
│ SSA                         6 / 7  │
│ ফোনটি জেগে রাখতে সাহায্য করুন      │
│                                    │
│ Emergency mode চালু থাকলে SSA      │
│ foreground service ব্যবহার করে     │
│ nearby connection চালু রাখার       │
│ চেষ্টা করে। কিছু ফোন battery       │
│ saver-এ background কাজ থামাতে পারে।│
│                                    │
│ ┌────────────────────────────────┐ │
│ │ সবচেয়ে ভালো প্রস্তুতি           │ │
│ │ Foreground notification চালু   │ │
│ │ রাখুন এবং battery settings     │ │
│ │ review করুন।                   │ │
│ └────────────────────────────────┘ │
│                                    │
│ [ battery settings দেখুন ]         │
│ এখন বাদ দিন — limitation বুঝেছি   │
└────────────────────────────────────┘
```

The wizard must not silently disable battery optimization or change radios. The user explicitly chooses whether to open Android settings.

### WF-07 — Live readiness check

```text
┌────────────────────────────────────┐
│ SSA                         7 / 7  │
│ SSA প্রস্তুতি পরীক্ষা               │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ ✓ Nearby permission             │ │
│ │   Bluetooth ও Wi‑Fi access     │ │
│ ├────────────────────────────────┤ │
│ │ ✓ Notification                  │ │
│ │   জরুরি alert tray-তে দেখাবে   │ │
│ ├────────────────────────────────┤ │
│ │ ! Battery policy                │ │
│ │   OEM setting review দরকার      │ │
│ │   [ settings খুলুন ]            │ │
│ ├────────────────────────────────┤ │
│ │ ○ Verified phones               │ │
│ │   এখনো কোনো bridge কাছে নেই    │ │
│ └────────────────────────────────┘ │
│                                    │
│ Ready to search                   │
│ কাছের verified ফোন খোঁজা যাবে     │
│                                    │
│ [ nearby search শুরু করুন ]        │
│ ড্যাশবোর্ডে যান                    │
└────────────────────────────────────┘
```

The “Verified phones” row is informational, not a setup failure. It should become ready when an authenticated peer is available. Critical failures use a red or high-contrast warning row and a recovery action; optional items use amber; ready items use green with text, not color alone.

### WF-08 — Critical issue recovery

```text
┌────────────────────────────────────┐
│ SSA / আবার চেষ্টা করুন              │
│                                    │
│ কাছের connection এখনও প্রস্তুত নয়  │
│                                    │
│ কারণ                               │
│ Bluetooth permission বন্ধ আছে       │
│                                    │
│ কী করবেন                           │
│ 1. Android Settings খুলুন           │
│ 2. SSA-কে Nearby permission দিন     │
│ 3. ফিরে এসে আবার পরীক্ষা করুন      │
│                                    │
│ [ Android Settings খুলুন ]          │
│ [ আবার পরীক্ষা করুন ]               │
│ limited mode-এ চালিয়ে যান          │
└────────────────────────────────────┘
```

The recovery screen is reusable for permission denial, radio unavailable, notification denial, and battery policy. The cause, impact, and action must be explicit. `Try again` re-checks actual system state rather than assuming the settings change worked.

### WF-09 — Completion

```text
┌────────────────────────────────────┐
│ SSA / প্রস্তুত                     │
│                                    │
│ ✓ SSA search করার জন্য প্রস্তুত     │
│                                    │
│ কাছের verified SSA ফোন পাওয়া গেলে │
│ encrypted alert পাঠানোর চেষ্টা     │
│ করা যাবে।                          │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ মনে রাখবেন                     │ │
│ │ queued ≠ delivered              │ │
│ │ প্রাপক acknowledgement না আসা   │ │
│ │ পর্যন্ত delivered বলা হবে না    │ │
│ └────────────────────────────────┘ │
│                                    │
│ [ ড্যাশবোর্ড খুলুন ]                │
│ Network readiness পরে দেখুন        │
└────────────────────────────────────┘
```

If a critical check is unresolved, the title becomes `Limited mode` and the primary CTA becomes `সমস্যা ঠিক করুন` / `Fix setup`. The dashboard remains accessible, but the top banner must state exactly what is unavailable.

## 5. Permission and readiness state behavior

| State | Visual treatment | Resident copy | Volunteer copy | Action |
|---|---|---|---|---|
| Checking | Neutral progress indicator | “ফোনের প্রস্তুতি পরীক্ষা হচ্ছে” | “Checking transport and relay readiness” | No action until result. |
| Ready | Green icon plus text | “প্রস্তুত” | “Ready to search” | Continue. |
| Needs attention | Amber icon plus impact | “এই setting review করুন” | “Battery policy may affect relay persistence” | Open settings or skip. |
| Blocked | High-contrast error row | “অনুমতি বন্ধ — কাছের ফোন খোঁজা যাবে না” | Include technical cause and permission name | Open settings, re-check. |
| Denied but recoverable | Amber explanation | “আবার অনুমতি দিতে পারেন” | Include last-check timestamp | Request again or continue limited. |
| Unsupported | Neutral limitation | “এই ফোনে এই transport available নয়” | Show diagnostic detail | Continue limited; do not claim mesh ready. |
| No nearby peer | Neutral empty state | “এখন কোনো verified ফোন কাছে নেই” | Show discovery/relay detail | Keep search running or return dashboard. |

## 6. Navigation and interruption rules

The wizard should appear once after first identity initialization, then be reachable from the Network tab as **Setup and readiness**. If the user exits halfway through, the next launch resumes at the first unresolved critical step rather than restarting from zero.

A persistent dashboard banner should be shown until critical setup is complete. The banner must include one action, such as `Fix nearby setup`, and a secondary `View details` route. The user can dismiss explanatory text but cannot dismiss the actual readiness state.

A notification tap should still open the alert detail route even if setup is incomplete. Incoming encrypted messages must not be discarded solely because the user skipped the wizard; the app should persist what it can and show the appropriate degraded-state warning.

## 7. Copy rules for low-literacy use

Each screen should use one short headline, no more than three short explanatory lines before the action, and a compact “Why this matters” card. Technical terms such as `Nearby`, `encrypted`, `battery saver`, and `relay` may remain in English where that is the familiar Android label, but the consequence must be explained in Bengali first.

Avoid saying “guaranteed,” “always,” “instant,” “official,” or “delivered” during setup. Use “চেষ্টা করবে” / “will try,” “প্রস্তুত to search,” and “পৌঁছানোর প্রমাণ” / “delivery evidence.”

## 8. Implementation mapping

| Design element | Existing implementation area | Recommended change |
|---|---|---|
| Language persistence | `mobile/lib/ssa-theme.tsx` | Reuse current language state; initialize wizard copy from it. |
| Resident/Volunteer choice | `mobile/lib/ssa-theme.tsx` and Settings | Move the first choice into onboarding and keep Settings as an edit point. |
| Native permission request | `mobile/lib/sanketly-provider.tsx` | Extract a reusable permission-status/request helper so the wizard and `startMesh` use the same logic. |
| Nearby readiness | Network tab and native Nearby module | Expose structured readiness results instead of parsing status text. |
| Notification permission | `mobile/lib/notifications.ts` | Return `granted`, `denied`, or `blocked` state and provide a settings route. |
| Battery guidance | `openBatterySettings` | Keep it user-initiated; record only local “reviewed/skipped” preference. |
| Wizard persistence | New onboarding state key | Store current step, completed critical steps, and wizard version for future re-entry. |
| Dashboard banner | `mobile/app/(tabs)/index.tsx` | Show the first unresolved critical readiness issue. |
| Accessibility | Shared SSA UI components | Add accessibility labels, large text support, TalkBack order, and non-color status text. |

## 9. Acceptance criteria

1. On a clean install, Bengali is selected by default and the user can switch to English or Hindi before any system permission prompt.
2. The wizard explains the purpose and consequence of each permission before requesting it.
3. Android permission prompts are requested one logical group at a time, not as an unexplained batch.
4. A denied notification permission does not prevent mesh startup or local alert persistence, but the limitation remains visible.
5. A denied critical Nearby permission prevents the UI from claiming that nearby search is ready.
6. The user can open Android Settings and return to a real re-check screen.
7. Android-version-specific permissions are shown only when relevant.
8. Battery optimization is presented as a reliability recommendation, not a silently changed setting.
9. No nearby peer is shown as a setup failure.
10. The user can reach the dashboard in limited mode without data loss.
11. The wizard resumes after interruption and does not repeatedly ask for already-granted permissions.
12. Bengali, Hindi, and English layouts remain readable with large system font settings.
13. Voice-over/TalkBack users can identify the current step, status, primary action, and recovery action in a logical order.
14. The final screen distinguishes “ready to search” from “message delivered.”
15. The flow is testable on at least two Android versions and three physical devices before being called pilot-ready.

## 10. Recommended build sequence

The first implementation slice should create a reusable `ReadinessWizard` route and a typed `readiness-state` utility. The utility should return structured rows for permissions, transport, notification, battery policy, and peer availability. The existing provider start logic can then consume the same utility, preventing the wizard and Network tab from disagreeing.

The second slice should implement the Bengali-first screens, persistence, recovery routing, and dashboard banner. The third slice should add accessibility testing, Hindi/English copy review, and physical-device validation for denied permissions, notification behavior, backgrounding, and process recreation.

### References

[1]: https://github.com/susankarkarmakar-pixel/sanketly/blob/feat/mobile-mesh-foundation/mobile/app/onboarding.tsx "SSA current informational onboarding route"

[2]: https://github.com/susankarkarmakar-pixel/sanketly/blob/feat/mobile-mesh-foundation/mobile/app/(tabs)/network.tsx "SSA current network readiness screen"
