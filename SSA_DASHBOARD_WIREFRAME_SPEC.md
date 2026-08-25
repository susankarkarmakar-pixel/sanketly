# Sanket Setu Alert (SSA)
## Mobile Dashboard UI/UX Wireframe and Component Specification

**Document status:** Implementation-ready wireframe specification
**Primary platform:** Android mobile
**Primary user:** A resident or volunteer operating SSA during an emergency
**Design language:** Bengali-first, low-literacy friendly, offline-aware, high-contrast, action-oriented

> **Design principle:** The dashboard must answer three questions within three seconds: “Am I connected?”, “Is there an active danger?”, and “What can I do now?”

## 1. Product experience direction

SSA is an emergency communication tool, not a conventional social application. The dashboard should therefore prioritize immediate comprehension over feature density. The first visual layer communicates safety status and network reach. The second layer exposes urgent alerts and the primary action. The third layer provides operational detail for users who need to inspect peers, queued messages, relay activity, or device health.

The interface is Bengali-first. Every critical action receives a Bengali label, with a short English fallback only where it improves technical clarity. Copy must use ordinary spoken Bengali rather than administrative language. Icons must never be the only carrier of meaning; each icon is paired with a readable label or accessible content description.

## 2. Navigation model

The recommended information architecture uses four persistent destinations. The dashboard is the default landing screen, Alerts contains received and sent emergency notices, Network explains nearby peers and relay health, and Settings contains identity, permissions, battery, language, and test-mode controls.

| Destination | Bengali label | Primary job | Default badge |
|---|---|---|---|
| Dashboard | ড্যাশবোর্ড | Show network readiness and the next safe action | Active-alert count |
| Alerts | সতর্কবার্তা | Review, acknowledge, and resend alerts | Unread count |
| Network | নেটওয়ার্ক | Inspect peers, relay path, and queued delivery | Connected-peer count |
| Settings | সেটিংস | Manage permissions, identity, language, and emergency mode | None |

### Root component tree

```text
SsaApp
├── SsaStatusProvider
├── SafeAreaRoot
│   ├── AppHeader
│   │   ├── SsaWordmark
│   │   ├── EmergencyModePill
│   │   └── SettingsButton
│   ├── RootNavigator
│   │   ├── DashboardScreen
│   │   ├── AlertsScreen
│   │   ├── NetworkScreen
│   │   └── SettingsScreen
│   └── BottomNavigationBar
└── GlobalEmergencyBanner
```

## 3. Dashboard anatomy

The dashboard is a vertically scrolling screen with a stable top status header and a sticky emergency action. The layout is designed for one-handed use on 360–430 dp Android devices. The main content uses 16 dp side margins, 12–16 dp vertical gaps, and 48–56 dp minimum touch targets.

### Dashboard wireframe hierarchy

```text
┌─────────────────────────────────────┐
│ [SSA mark] Sanket Setu Alert   [⚙]  │  App header
│ নিরাপদ / নেটওয়ার্ক সক্রিয়          │  Connection state
├─────────────────────────────────────┤
│ [CRITICAL / SAFE status card]       │  Situation summary
│ “আপনার আশেপাশে ৩টি SSA ডিভাইস”      │
│ [নেটওয়ার্ক চালু রাখুন]              │  Emergency mode CTA
├─────────────────────────────────────┤
│ [লাল SOS সতর্কবার্তা পাঠান]         │  Primary emergency action
│ Press and hold 1.5 sec              │  Accidental-send guard
├─────────────────────────────────────┤
│ আজকের সতর্কবার্তা                    │  Alert summary
│ [Flood] [Fire] [Medical] [SOS]       │  Four quick categories
├─────────────────────────────────────┤
│ সর্বশেষ সতর্কবার্তা                  │  Alert feed
│ Alert card with severity + route     │
├─────────────────────────────────────┤
│ নেটওয়ার্কের অবস্থা                  │  Mesh operations
│ 3 peers · 2 relays · 1 queued       │
│ [নেটওয়ার্ক দেখুন]                   │
├─────────────────────────────────────┤
│ Battery / permission / relay health  │  Operational warnings
├─────────────────────────────────────┤
│ ড্যাশবোর্ড   সতর্কবার্তা  নেটওয়ার্ক সেটিংস │ Bottom nav
└─────────────────────────────────────┘
```

### Dashboard component inventory

| Component | Purpose | Required states | Primary action |
|---|---|---|---|
| `AppHeader` | Brand, emergency mode, settings | Normal, emergency, degraded | Open Settings |
| `EmergencyModePill` | Persistent service status | Off, starting, active, attention | Open Network |
| `SituationCard` | Summarize readiness and immediate risk | Safe, connected, offline, alert nearby | Start/stop emergency mode |
| `SosActionCard` | Send a high-priority SOS safely | Idle, armed, sending, queued, sent, failed | Long press to send |
| `AlertCategoryGrid` | Start structured alerts quickly | Available, disabled, draft | Open compose flow |
| `RecentAlertCard` | Surface the most relevant alert | New, relayed, delivered, expired | Open alert detail |
| `MeshHealthCard` | Explain nearby network reach | No peers, discovering, connected, relaying, degraded | Open Network |
| `DeviceHealthRow` | Expose actionable device problems | Battery, permission, radio, notification | Open corrective setting |
| `BottomNavigationBar` | Persistent navigation | Selected/unselected, unread badge | Switch destination |

## 4. Dashboard states

The dashboard must not rely on color alone. Every state combines a short Bengali label, an icon or shape, and a concise explanation. The most important state is always visible above the fold.

| State | Header label | Situation card | CTA | Supporting copy |
|---|---|---|---|---|
| Ready | `নিরাপদ · নেটওয়ার্ক সক্রিয়` | Green status ring, peer count, last sync | `নেটওয়ার্ক চালু রাখুন` | `কাছের SSA ডিভাইসের সঙ্গে সংযোগ আছে` |
| Starting | `সংযোগ খোঁজা হচ্ছে` | Amber progress indicator | `অনুমতি দিন` | `কাছের ডিভাইস খোঁজা হচ্ছে` |
| Offline | `অফলাইন · সংরক্ষণ চলছে` | Gray/amber status, queued count | `আবার চেষ্টা করুন` | `ইন্টারনেট ছাড়াও বার্তা সংরক্ষিত থাকবে` |
| Alert nearby | `সতর্কতা পাওয়া গেছে` | Red severity band with timestamp | `সতর্কবার্তা খুলুন` | `আপনার এলাকায় নতুন জরুরি তথ্য এসেছে` |
| Degraded | `নেটওয়ার্কে সমস্যা` | Orange warning panel | `সমাধান দেখুন` | `Bluetooth, Wi-Fi বা ব্যাটারি সেটিং পরীক্ষা করুন` |
| Emergency active | `জরুরি মোড চালু` | Dark red top rail, foreground-service indicator | `জরুরি মোড বন্ধ করুন` | `SSA কাছের ডিভাইসের মাধ্যমে বার্তা পাঠাচ্ছে` |

## 5. Emergency action design

The SOS control must be visually dominant but difficult to trigger accidentally. A single tap opens a confirmation sheet; a long press of 1.5 seconds sends immediately after the user sees the action text. The action must remain available when the device is offline because the message can be queued for relay.

```text
┌─────────────────────────────────────┐
│ জরুরি সাহায্য পাঠান                 │
│ আপনার অবস্থান ও সাহায্যের অনুরোধ    │
│ কাছের SSA ডিভাইসে পাঠানো হবে         │
│                                     │
│        [  SOS  ]                    │
│  ধরে রাখুন · ১.৫ সেকেন্ড             │
│                                     │
│ সর্বশেষ: ২ মিনিট আগে · ২টি relay     │
└─────────────────────────────────────┘
```

The SOS action has these feedback stages: `প্রস্তুত`, `পাঠানো হচ্ছে`, `সংরক্ষণ করা হয়েছে`, `relay-এর জন্য অপেক্ষা করছে`, `পৌঁছেছে`, and `পাঠানো যায়নি`. The user must never see a false “delivered” state when the packet has only been accepted by the local queue.

## 6. Structured alert quick actions

The four first-release categories are Flood, Fire, Medical, and SOS. Each category uses a bold icon, a Bengali label, and an optional English micro-label. The grid should use two columns with equal-width cards and a minimum 56 dp height.

| Category | Bengali label | Accent | First compose fields |
|---|---|---|---|
| Flood | বন্যা | Deep blue | Water level, road/area, urgency |
| Fire | আগুন | Red-orange | Location, spread, people at risk |
| Medical | চিকিৎসা | Green | Patient count, urgency, needed help |
| SOS | জরুরি সাহায্য | Red | Situation, safe callback method |

The first release should keep the compose flow short. A user should be able to create a valid alert in under 30 seconds with category, location description, urgency, and optional note. The app should default to the user’s saved locality rather than requiring a map interaction.

## 7. Alert feed and alert detail

The dashboard feed shows no more than three cards before a “সব সতর্কবার্তা দেখুন” link. Each alert card exposes severity, category, approximate area, age, current delivery state, and relay count. The card must not expose private message content to an intermediate relay user.

```text
AlertCard
├── SeverityStripe
├── CategoryIcon + CategoryLabel
├── AlertTitle
├── AreaAndTime
├── DeliveryStatusChip
├── RelayPathSummary
└── ChevronAction
```

The alert detail screen contains the full message, sender verification state, received time, relay history, and actions to acknowledge, forward, or mark as resolved. Acknowledge is a local action in the first release; end-to-end acknowledgement packets should be added only when the protocol supports them.

## 8. Network screen

The Network screen is an operational view for volunteers, bridge operators, and technically curious residents. It should remain understandable to a regular resident by showing plain-language summaries before technical identifiers.

| Section | Visual treatment | Data shown |
|---|---|---|
| Network summary | Large status card | Active mode, connected peers, last event |
| Nearby devices | List cards | Friendly name, verified state, connection age |
| Relay activity | Timeline | Relayed count, queued count, retry/expiry state |
| Device readiness | Checklist | Bluetooth, Wi-Fi, permissions, notification, battery |
| Test mode | Outlined panel | Two-device and three-device test actions |

The peer list should show `Verified`, `Connecting`, `Waiting for approval`, or `Disconnected`. Technical endpoint IDs are hidden behind a “ডিভাইসের তথ্য” disclosure row. This protects low-literacy users from unnecessary identifiers while preserving debugging access for pilot operators.

## 9. First-run and permission onboarding

First launch uses a three-step setup flow instead of presenting a permission wall. Step 1 explains the purpose in Bengali. Step 2 requests nearby-device and notification permissions with a reason immediately before each system prompt. Step 3 asks the user to start emergency mode and explains the persistent notification.

```text
Onboarding
├── Welcome: “ইন্টারনেট না থাকলেও সাহায্যের বার্তা পৌঁছাক”
├── Nearby access: “কাছের ফোন খুঁজে বার্তা পাঠাতে”
├── Notification: “জরুরি সতর্কবার্তা দেখতে”
├── Battery guidance: “জরুরি মোড বন্ধ না হওয়ার জন্য”
└── Ready check: “SSA প্রস্তুত”
```

A denied permission must create a recoverable inline card, not a dead end. Each card states why the permission matters, provides one corrective action, and links to system settings if needed.

## 10. Component design tokens

The wireframe uses a dark, high-contrast base because the current SSA reference shell already uses a dark interface and emergency state cards. Production visual styling can refine this token set, but component geometry and semantic roles should remain stable.

| Token | Value | Use |
|---|---:|---|
| `color.canvas` | `#0E1426` | Screen background |
| `color.surface` | `#171E35` | Primary cards |
| `color.surfaceRaised` | `#202A46` | Elevated cards and sheets |
| `color.textPrimary` | `#F6F7FB` | Main text |
| `color.textSecondary` | `#B6C0D8` | Explanatory text |
| `color.brand` | `#89A9FF` | Primary navigation/action |
| `color.success` | `#5EE1A3` | Connected/verified |
| `color.warning` | `#F4C46A` | Attention/queued |
| `color.danger` | `#FF6B6B` | SOS/critical |
| `radius.card` | `20–24 dp` | Primary cards |
| `radius.control` | `12–14 dp` | Buttons and inputs |
| `spacing.screen` | `16–20 dp` | Horizontal screen margin |
| `touch.minimum` | `48 dp` | Minimum interactive target |

Typography should use a Bengali-capable Android font with strong legibility at small sizes. Headings should be semibold or bold, body text should use a comfortable 1.35–1.5 line height, and status labels should never be below 12 sp.

## 11. Accessibility and low-literacy rules

The dashboard should support large text without clipping, screen-reader labels in Bengali, minimum 4.5:1 contrast for normal text, and 3:1 for large text or active controls. Touch targets must be at least 48 dp, with extra spacing between destructive and safe actions. SOS cannot be activated by an accidental swipe or by a single ambiguous tap.

Every status chip must include a text state. For example, a green dot alone is insufficient; use `সংযুক্ত · ৩টি ডিভাইস`. Motion should be optional and never the only indication that a message is being relayed. Offline and queued states should remain visible after navigation and app restart.

The app should support a Bengali/English language toggle in Settings, but the first-run default should follow the device locale and offer Bengali prominently. Date/time should use local conventions, while technical identifiers remain copyable for pilot support.

## 12. Implementation component map

```text
components/ssa/
├── app-header.tsx
├── emergency-mode-pill.tsx
├── situation-card.tsx
├── sos-action-card.tsx
├── alert-category-grid.tsx
├── recent-alert-card.tsx
├── mesh-health-card.tsx
├── device-health-row.tsx
├── nearby-peer-card.tsx
├── relay-timeline.tsx
├── delivery-status-chip.tsx
├── permission-recovery-card.tsx
├── bottom-navigation-bar.tsx
└── emergency-confirmation-sheet.tsx

screens/
├── dashboard-screen.tsx
├── alerts-screen.tsx
├── alert-detail-screen.tsx
├── compose-alert-screen.tsx
├── network-screen.tsx
├── settings-screen.tsx
└── onboarding-screen.tsx
```

Each component should receive semantic data rather than raw transport details. For example, `MeshHealthCard` should receive `connectedPeerCount`, `relayQueueCount`, `state`, and `onOpenNetwork`; it should not know about Nearby endpoint IDs or native module event names.

## 13. Critical user journeys

| Journey | Entry point | Success condition | Failure recovery |
|---|---|---|---|
| Start emergency mode | Dashboard CTA | Foreground notification appears and status becomes active | Show missing permission/radio/battery action |
| Send SOS offline | Dashboard SOS | Alert shows queued/relaying state | Keep record in outbox and expose retry |
| Receive alert | Global banner or Alerts tab | User opens detail and sees verified source | Explain unverified/expired state |
| Approve nearby peer | Network or global request card | Peer becomes verified/connected | Reject or retry connection |
| Relay across phones | Network status | Relay count increments without exposing plaintext | Show queue/expiry state |
| Recover after restart | App launch or service reattachment | Pending state and alert feed are restored | Explain what must be enabled |

## 14. Definition of done for the dashboard wireframe

The wireframe is ready for implementation when a resident can identify network readiness, start emergency mode, send an SOS, and open a received alert without reading technical documentation. A pilot volunteer must also be able to inspect nearby peers, relay activity, queued packets, and device readiness from the Network screen.

Implementation should preserve the existing provider boundary: UI components consume semantic SSA state, while the provider owns encryption, packet routing, relay queue persistence, Nearby events, and foreground-service status. The wireframe does not claim that a queued packet has been delivered, and it keeps technical transport details out of the primary resident path.

## 15. Recommended build order

First implement the dashboard shell, status card, SOS action, alert category grid, and bottom navigation using static fixtures. Then bind the real mesh status and relay queue. Next add structured alert composition and alert detail. Finally add onboarding, permission recovery, network diagnostics, and visual QA on low-end Android devices.

The first usability test should include Bengali-speaking residents with mixed literacy levels. Measure time to understand network status, time to send a test SOS, error recovery after a denied permission, and whether users can distinguish `queued`, `relaying`, and `delivered` without assistance.
