# SameSalt — Submission Checklist

Everything in one place. Work top to bottom.

## Status

| Item | Status |
|---|---|
| App builds & runs on Android | ✅ Done |
| Core pricing/NTI/safety bugs (red-team audit #1) | ✅ Fixed & verified live |
| Cloudflare Worker (scan API) auth required, fails closed | ✅ Done |
| GitHub repo public | ✅ https://github.com/darshanrajagoli/samesalt |
| RevenueCat: entitlement, offering, packages, trial | ✅ Verified in dashboard |
| Devpost account uses student email | ✅ You confirmed |
| Demo video script | ✅ [DEMO_SCRIPT.md](DEMO_SCRIPT.md) |
| Demo video recorded | ⬜ Your turn — see below |
| Devpost submission text | ✅ [DEVPOST_SUBMISSION.md](DEVPOST_SUBMISSION.md) |
| Devpost submission form filled + submitted | ⬜ Your turn |
| Second red-team audit pass | 🔄 Running now |

## What's left for you, in order

1. **Record the demo video.** Open [DEMO_SCRIPT.md](DEMO_SCRIPT.md) — it has
   the exact lines to say and taps to make, plus step-by-step recording and
   YouTube upload instructions at the bottom. ~10 minutes of work.
2. **Submit on Devpost.** Go to
   https://revenuecat-shipaton-2026.devpost.com/, click Submit, and
   copy-paste each section from [DEVPOST_SUBMISSION.md](DEVPOST_SUBMISSION.md)
   into the matching form field. Paste your YouTube video link and the
   GitHub repo link (https://github.com/darshanrajagoli/samesalt) where asked.
3. **Send me the video link before you submit** if you want me to sanity-check
   timing/content — otherwise just submit.

## Reference docs in this repo

- [README.md](README.md) — project overview, quick start, tech stack
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md) — word-for-word video script + recording steps
- [DEVPOST_SUBMISSION.md](DEVPOST_SUBMISSION.md) — copy-paste submission text
- [DATA_LICENSE.md](DATA_LICENSE.md) — dataset attribution (CC BY-SA 4.0)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — technical deep-dive

## If something breaks while recording

- **Scan fails once:** just tap capture again — the scan call now
  auto-retries transient failures, but a full network drop still needs a
  manual retry.
- **App shows a "Something went wrong" screen with a Reload button:** that's
  the in-app error boundary catching a real crash — tap Reload. If you see a
  *red* Metro error overlay instead (with a stack trace), that means the dev
  bundler isn't running or crashed — tell me and I'll restart it.
- **Search feels slow the first time:** normal — the 65MB database is
  copying to the device on first launch after an install. Wait ~15 seconds
  before recording. Search itself is a bit sluggish on lower-end phones
  (full table scan, no full-text index yet) — that's expected, not a bug.
