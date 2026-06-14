# notify-plus

A smart, **on-device** notification center for Telegram deal/discount channels.

You follow a bunch of Telegram discount channels, but if you leave them unmuted your phone is
flooded — and if you mute Telegram you miss the time-sensitive deals. notify-plus lets you keep the
channels quiet and still catch the good stuff: it reads incoming Telegram notifications **on the
device**, keeps only the ones matching your keywords (or everything from selected channels),
re-alerts you **loudly** with a custom sound/vibration, and — because the loud alert is a normal
Android notification — it **mirrors to your Galaxy Watch / Wear OS automatically**.

No backend. No Telegram login. Nothing leaves your device.

---

## How it works

```text
You set deal channels to NOTIFYING-BUT-SILENT in Telegram (NOT muted), Message Previews ON
        │
        ▼
[Telegram] posts a silent Android notification (full text in extras)
        │
        ▼
[notify-plus NotificationListenerService]  ← OS-managed; runs even when the app UI is closed
        │  reads title / EXTRA_TEXT / EXTRA_BIG_TEXT / EXTRA_MESSAGES, Turkish-aware normalize
        │
        ├─ keyword match → post our OWN loud notification (custom channel) + queue it
        │                   (+ optionally cancel the silent original)
        └─ no match → ignore
        ▼
[Our loud notification] ──OS mirrors automatically──► [Galaxy Watch / Wear OS]
        ▼
When the app opens, the queued matches are drained into an op-sqlite + FTS5 archive (searchable
"Notification Center"). The native listener never needs the React Native runtime to be alive.
```

### Why this design (vs. an embedded Telegram/TDLib client)

This was chosen after validating the alternatives (see `/.claude/plans/`). Reading the Android
notification shade instead of embedding a Telegram client removes the three biggest risks:

- **No Telegram account-ban risk** — we never log in.
- **No 152 MB immature TDLib dependency.**
- **No Google Play `specialUse` foreground-service review** — `BIND_NOTIFICATION_LISTENER_SERVICE`
  is an allowed, BuzzKill-style use; on-device-only keeps Data Safety = "No data collected".

The trade-off: notify-plus only sees what Telegram actually posts. That requires a one-time Telegram
config (below). For a *deals* notifier (redundant, best-effort) that's an acceptable trade; for a
"never miss a single message" use case it would not be.

---

## The one piece of setup that matters (Telegram)

For notify-plus to read the message text, in Telegram:

1. **Settings → Notifications and Sounds → Message Previews = ON.**
2. For each deal channel: **do NOT mute it.** Open the channel → notification settings → set
   **Sound = None / Disable Sound** (it stays *unmuted but silent* — it still posts a notification
   we can read; a *muted* channel posts nothing and is invisible to us).
3. **Remove any Telegram passcode lock** (a lock redacts text to "You have a new message").

The in-app onboarding wizard walks through this and includes a **live diagnostic** that confirms
real text is coming through (and warns if it looks redacted).

---

## Requirements

- **Node ≥ 22**, **pnpm** (this project uses pnpm, not npm — see `.npmrc`)
- **JDK 17** and the **Android SDK** (Android Studio) for building
- A physical Android device (notification access + battery behavior can't be validated on most
  emulators; the Galaxy Watch test obviously needs the real watch)

> This project uses **pnpm** with `node-linker=hoisted` (in `.npmrc`) so React Native's Metro and
> Gradle autolinking resolve a flat `node_modules`. Use `pnpm`/`pnpx`, not `npm`/`npx`.

## Build & run

```sh
pnpm install
pnpm start            # Metro (terminal 1)
pnpm android          # build + install on a connected device (terminal 2)
```

First launch drops you into the onboarding wizard: disclosure → grant Notification access → allow
notifications → configure Telegram → battery whitelist → live diagnostic.

## Quality checks (run locally)

```sh
pnpm exec tsc --noEmit   # typecheck
pnpm test                # jest unit tests (matching + FTS sanitizer)
pnpm exec eslint . --ext .ts,.tsx --quiet   # lint (errors only)
```

The unit tests cover the Turkish-aware normalization/matching and the FTS5 query sanitizer
(`__tests__/matching.test.ts`) — these are pure and run without a device.

---

## Project structure

```text
android/app/src/main/java/com/notifyplus/notify/
  NotifyListenerService.kt  – OS-bound listener: extract text, dedup, match, post, queue, cancel
  NotifyModule.kt           – JS↔native bridge (permissions, settings, rules, channels, queue)
  NotifyPackage.kt          – registers the module (legacy package; works under New Arch interop)
  NotifyEventBus.kt         – forwards live events to JS only when the RN runtime is alive
  TextNormalizer.kt         – Turkish-aware fold (mirror of src/matching/normalize.ts)
  TextMatcher.kt / Rules.kt – rule model + matching
  Notifications.kt          – channel creation + posting (custom sound/vibration)
  PendingStore.kt           – native SQLite queue of matched messages (drained by JS)
  RulesStore.kt             – SharedPreferences: rules + prefs (readable by the service)

src/
  native/NotifyModule.ts    – typed wrapper + NotifyEvent stream
  db/db.ts, db/fts.ts       – op-sqlite + FTS5 archive, search, drain-from-native, query sanitizer
  matching/normalize.ts, match.ts – JS mirror (used for the live "test a keyword" preview)
  rules/ store/ hooks/ ui/ screens/ – app logic, state, components, and the 3 screens + onboarding
App.tsx                     – root: onboarding gate + Deals / Rules / Settings tabs
```

## Adding a custom alert sound

1. Drop an `.mp3`/`.ogg` into `android/app/src/main/res/raw/<name>` (lowercase, no spaces).
2. Add a channel referencing it (channels are **immutable** after creation, so use a versioned id):

   ```ts
   // src/rules/channels.ts
   { id: 'deals_loud_v1', name: 'Loud deals', importance: 'high', sound: 'myalarm', vibrate: true,
     vibrationPattern: [0, 500, 200, 500] }
   ```

3. Rebuild (`pnpm android`). Point a rule at the new channel. To change a sound later, bump the id
   (e.g. `deals_loud_v2`).

---

## On-device verification protocol

Do these on a **real Samsung/Galaxy device** with your watch paired.

1. **Capture spike (do this first — the riskiest assumption):** enable **Diagnostic mode** (Settings
   or the onboarding step), set 2–3 real discount channels to notifying-but-silent, and watch the
   live feed. Confirm you get **full message text**, not "You have a new message" or
   "X new messages". If it's mostly generic, fix Message Previews / passcode / mute before going
   further.
2. **Functional:** add a rule with a keyword you know will appear → wait for a matching message →
   confirm a **loud notification fires on the phone AND mirrors to the Galaxy Watch**; a
   non-matching message stays silent. Flip a rule to **"All from sources"** mode and re-check.
3. **Suppression:** enable "Hide the original Telegram notification on match" and confirm the silent
   original is removed while our loud one shows.
4. **Search:** accumulate some messages, then search in the **Deals** tab using Turkish terms — test
   `akıllı` vs `akilli`, `İ`/`ı`, diacritics, prefixes like `indir`. Confirm relevant ordering and
   that special characters (`-`, `(`, `%`, `"`) never error.
5. **Resilience:** force-stop the app, swipe it from recents, reboot the phone → confirm matches
   still arrive (the listener should rebind). Note any device that needs manual battery-whitelisting.

---

## Known limitations & risks

- **OEM battery killers (Samsung is aggressive)** are the #1 real-world failure mode. Both Telegram
  and notify-plus must be excluded from battery optimization (the wizard guides this). Some devices
  also need "autostart" enabled. `requestRebind()` is best-effort — a few devices need a reboot to
  restore the listener.
- **Text depends on Telegram's config** (previews on, no passcode, not muted). Under heavy load
  Telegram may collapse to a generic "X new messages" summary — those are skipped (best-effort).
- **Media-only messages** with no caption have no matchable text.
- **Android-only.** iOS has no notification-read API; an iOS version would need a different design.

## Roadmap (not built yet)

- Per-keyword-group channels with distinct custom sounds; quiet hours; rule import/export.
- Multi-app filtering (the listener is app-agnostic — WhatsApp, etc.).
- Optional "guaranteed capture" power mode via on-device TDLib (heavy warnings; captures muted
  channels) — deliberately deferred and off the critical path.
- iOS (separate architecture; likely server/bot-based for public channels + push).

## Deviations from the approved plan (and why)

- **Matching/alerting run natively, not in op-sqlite/JS.** When the app is closed there is no JS
  runtime, only the OS-managed listener — so op-sqlite can't be the write path. Native does the
  matching + loud alert + a small SQLite queue; op-sqlite owns the searchable archive, filled by
  draining that queue when the app runs.
- **Dropped MMKV + react-navigation + Notifee.** Prefs live in the native module's SharedPreferences;
  navigation is a lightweight in-app tab switch; notifications/channels are posted by our own native
  code (Notifee is archived as of Dec 2024). This keeps the unverifiable native dependency surface
  to just **op-sqlite + our own module**.
- **minSdk raised 24 → 26** so notification channels always exist (drops dead legacy code paths).
- **No `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` permission** (a Play-restricted sensitive permission);
  we deep-link to the battery settings screen instead.
