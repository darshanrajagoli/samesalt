# SameSalt — Demo Video Script (under 2:00)

Record with the emulator/phone screen + your voice. Total target: ~1:45.

---

**[0:00–0:12] Hook (talking head or voiceover over app icon/splash)**

> "In India, the same medicine is sold under dozens of brand names at wildly
> different prices — and most people have no idea which ones are actually
> the same drug. Meet SameSalt."

---

**[0:12–0:35] Search demo (screen recording)**

1. Open the app, tap the search bar.
2. Type "Dolo 650" slowly enough for viewers to read.
3. Tap **Dolo 650 Tablet**.
4. Let the alternatives screen load — pause 1 second on the savings banner
   and the #1 result (Alice 650mg, ₹0.33/tablet).

> "Search any brand name — SameSalt finds every medicine with the exact
> same salt, strength, and dosage form, sorted by real price per tablet.
> Dolo 650 costs about ₹2.28 a tablet — the same paracetamol 650mg from
> another manufacturer costs ₹0.33 a tablet. Same drug, 86% cheaper."

---

**[0:35–0:55] Safety feature (screen recording)**

1. Go back, search "Thyronorm".
2. Tap **Thyronorm 100mcg Tablet**.
3. Show the red NTI warning banner.

> "But not every medicine is safe to switch. For Narrow Therapeutic Index
> drugs like Levothyroxine — where even a small difference between brands
> can matter — SameSalt refuses to suggest alternatives at all, and tells
> you to talk to your doctor instead."

---

**[0:55–1:15] Scan feature (screen recording)**

1. Tap the **Scan** tab.
2. Point the camera at a real medicine strip (have one ready beforehand).
3. Tap the capture button, wait for the result to load.

> "Don't know the name? Just scan the strip. SameSalt reads the salt
> composition with AI and finds the same matches — instantly, no typing."

---

**[1:15–1:35] RevenueCat / Family paywall (screen recording)**

1. Go to the **Cabinet** tab, tap the add-person icon top right.
2. Show the paywall appearing (Family plan, $9.99/month or $79.99/year
   with a 7-day free trial, Annual pre-selected as Best Value).

> "SameSalt is free forever for one person. Add a second family member,
> and that's where SameSalt Family comes in — powered end-to-end by
> RevenueCat, with a 7-day free trial. The paywall only ever shows up when
> you actually need it, never on launch."

---

**[1:35–1:48] Close**

> "SameSalt — built solo for the RevenueCat Shipaton. Medicine lookups run
> entirely offline from an on-device database; scanning uses a quick cloud
> lookup. Same drug, lower price, one scan away."

Show: app icon + GitHub repo URL text on screen
(`github.com/darshanrajagoli/samesalt`).

---

## Pre-flight checklist (do this BEFORE you hit record)

Do all of this once, up front — it's what separates a smooth take from five
retakes.

1. **App state:** the app is already installed and running on the emulator,
   the medicine database has finished loading (open it once and confirm the
   home screen shows the search bar, not "Loading medicine database..."),
   and camera permission is already granted (the emulator's back camera is
   wired to your webcam — you've been given a "Grant Camera Access" prompt
   once already; if you see it again mid-recording, that means the app was
   reinstalled since — tell me and I'll re-grant it before you record).
2. **Physical strip ready:** have a real medicine strip within arm's reach
   for the scan segment — any strip with a printed name works (an empty
   Crocin/Dolo/Paracetamol strip is fine). Since the emulator's camera is
   now your **webcam**, you'll hold the strip up to your actual webcam, not
   the phone screen.
3. **Audio check:** record 5 seconds of you talking, play it back. If it's
   quiet, echoey, or picking up fan/AC noise, move closer to the mic or
   switch to headphones-with-mic. Judges forgive so-so visuals; they do not
   forgive audio they can't understand.
4. **Lighting:** make sure the room isn't backlit (window behind you) if
   your face appears at all — put light in front of you, not behind.
5. **Quiet room:** close other apps/notifications on this machine so nothing
   pings or pops up mid-recording (Slack, email, etc.) — you'll be
   recording the full screen area, not just the emulator window, unless you
   crop the recording to just the emulator.
6. **Do a full dry run once, unrecorded** — read every line out loud while
   tapping through the app, stopwatch it. If you're way over ~1:50, decide
   now what to trim (the safest cut is shortening pauses between taps, not
   cutting a whole segment).
7. **Know your stop condition:** decide before you start that a small
   stumble is NOT a reason to restart — only restart on a real mistake
   (wrong screen, app crash, long silence). Judges care about clarity, not
   a flawless take.

## Brain-dead recording instructions

1. Make sure the emulator (or your phone with the dev build installed) is
   already running and the app is open to the home screen (see pre-flight
   checklist above).
2. Open a screen recorder:
   - **On the emulator:** in Android Studio, click the **⋮** (three dots) in
     the emulator toolbar → **Record and Playback** → **Start Recording**.
   - **On a real phone:** swipe down twice from the top → tap **Screen
     Record** → **Start**.
4. Read the hook line out loud (or type it as on-screen text if you'd
   rather not talk) while the app icon is showing.
5. Follow the steps above in order: Search → Dolo 650 → tap result → wait
   → Safety (Thyronorm) → Scan → Cabinet/paywall → Close.
6. Speak each italicized line as you perform the matching step — don't
   worry about being perfectly smooth, judges care about clarity, not
   polish.
7. Stop the recording once you've said the closing line.
8. Trim the very start/end in any simple video editor (or your phone's
   built-in Photos/Google Photos trimmer) so the total length is under
   2:00.
9. Upload to **YouTube** as **Unlisted** (not Private — Devpost needs a
   link judges can open without asking you for access):
   - Go to youtube.com → click the camera-with-plus icon (top right) →
     **Upload video**.
   - Pick your recording, set title to "SameSalt Demo — RevenueCat
     Shipaton 2026".
   - Under visibility, choose **Unlisted**.
   - Click **Publish**, copy the link.
10. Paste that YouTube link into the Devpost submission form's video field,
    and into the "Try it out" section alongside the GitHub repo link.

## If something goes wrong mid-recording

- **Don't stop and restart from zero for a small stumble** — pause, take a
  breath, keep going. You can trim mid-video silences in the editor if
  needed; a full restart costs more time than it saves.
- **App shows "Something went wrong" with a Reload button:** tap Reload,
  it'll recover in a couple seconds — keep that bit out of the final cut.
- **Camera looks black/frozen on the Scan screen:** back out to Home and
  back into Scan once; if it's still black, tell me immediately, don't
  keep recording around it.
- **Scan takes a while or fails once:** it auto-retries — just wait, or
  tap capture again once.
- Send me the raw clip or describe what happened if anything looks broken
  on playback — I can usually tell you in one message whether it's safe to
  ignore or worth a quick re-shoot of just that segment.
