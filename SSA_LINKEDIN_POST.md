# LinkedIn Post — Sanket Setu Alert (SSA)

## Recommended post

**যখন সব বন্ধ, সেতু খোলা থাকে — “Jokhon Shob Bondho, Setu Khola Thake.”**

I am building **Sanket Setu Alert (SSA)**, an Android-first offline emergency communication app designed for low-connectivity situations where ordinary internet-based communication may not be available.

SSA explores how nearby Android phones can act as a local communication mesh. Using Google Nearby Connections as the primary Android transport, a message can move from one phone to another, including through an intermediate relay device. The message content is protected with end-to-end encryption, authenticated peer identities, signed packet metadata, duplicate suppression, bounded multi-hop forwarding, retry queues, and recipient delivery acknowledgements.

The current pilot build includes:

- Bengali-first interface with Bengali, Hindi, and English language support.
- Light, dark, and system appearance modes.
- First-run readiness wizard for Nearby permissions, Bluetooth, Wi-Fi, notifications, and battery settings.
- Feature Test Center for exercising local cryptography, packet framing, identity storage, readiness checks, notifications, SOS composition, and alert flows one feature at a time.
- Structured emergency alerts for SOS, flood, fire, medical, missing-person, and other pilot scenarios.
- Local high-priority emergency notifications after a verified alert is decrypted and stored.
- Multi-hop relay logic with queued, forwarded, failed, expired, and recipient-evidence states.
- Volunteer-facing relay timeline and privacy-safe diagnostics export.
- A safer SOS interaction that requires deliberate user confirmation before final dispatch.

The pilot is being developed with the needs of rural and low-connectivity communities in mind, including the Gazole Development Block pilot context in Malda, West Bengal. The aim is not to replace emergency services, mobile networks, SMS, or human responders. The aim is to explore a resilient additional communication layer that can be tested transparently and improved with field evidence.

**Important status note:** SSA is currently a development and supervised-pilot candidate, not a production emergency-response service. Physical three-device relay testing, Android OEM background behavior, accessibility validation with intended users, hardened storage, identity recovery, abuse controls, production signing, privacy review, and operational partnerships are still required before any wider rollout.

I am looking for constructive feedback and collaboration from people working in:

**Civic technology · disaster response · rural connectivity · public-sector innovation · cybersecurity · Android engineering · Bengali/Hindi accessibility · community resilience**

If you have experience testing offline communication systems or designing technology for low-connectivity communities, I would value your feedback on the pilot test plan and real-world failure scenarios.

#SanketSetuAlert #SSA #CivicTech #DisasterResponse #OfflineFirst #MeshNetworking #RuralInnovation #DigitalPublicInfrastructure #Cybersecurity #WestBengal #Malda #BengaliTech

## Suggested first comment

SSA is being developed openly and iteratively. The most useful next evidence is a controlled three-device Android test with mobile data disabled: direct A→B delivery, A→B→C relay, acknowledgement return through B, background behavior, reboot recovery, and permission/radio failure handling. I will share verified results rather than making untested range or reliability claims.

## Short visual caption

**Sanket Setu Alert (SSA)**  
Offline emergency communication for low-connectivity situations.  
**Encrypted alerts · Nearby mesh · Multi-hop relay · Bengali-first readiness**
