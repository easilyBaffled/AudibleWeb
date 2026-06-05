# Benchmark Results

## Run Metadata

| Field | Value |
|---|---|
| Date | |
| Engine | Kokoro-FastAPI |
| Image | ghcr.io/remsky/kokoro-fastapi-cpu:latest |
| Voice | af_bella |
| Hardware | |
| Docker version | |
| Notes | |

---

## Sample 01 — Clean Short Article

| Field | Value |
|---|---|
| Sample name | 01-clean-short-article-synthetic.txt |
| Engine/wrapper | Kokoro-FastAPI |
| Voice used | af_bella |
| Generated file name | |
| Generation start time | |
| Generation end time | |
| Audio duration | |
| Overall score (1–5) | |
| Clarity (1–5) | |
| Pacing (1–5) | |
| Pronunciation (1–5) | |
| Prosody (1–5) | |
| Listening fatigue (1–5) | |
| Glitches | none / minor / major |
| Stability | pass / fail |
| Setup friction (1–5) | |
| Listen 20–40 min voluntarily? | yes / no |
| Notes | |

---

## Sample 02 — Long Essay

| Field | Value |
|---|---|
| Sample name | 02-long-essay-synthetic.txt |
| Engine/wrapper | Kokoro-FastAPI |
| Voice used | af_bella |
| Generated file name | |
| Generation start time | |
| Generation end time | |
| Audio duration | |
| Overall score (1–5) | |
| Clarity (1–5) | |
| Pacing (1–5) | |
| Pronunciation (1–5) | |
| Prosody (1–5) | |
| Listening fatigue (1–5) | |
| Glitches | none / minor / major |
| Stability | pass / fail |
| Setup friction (1–5) | |
| Listen 20–40 min voluntarily? | yes / no |
| Notes | |

---

## Sample 03 — Fiction Dialogue

| Field | Value |
|---|---|
| Sample name | 03-fiction-dialogue-synthetic.txt |
| Engine/wrapper | Kokoro-FastAPI |
| Voice used | af_bella |
| Generated file name | |
| Generation start time | |
| Generation end time | |
| Audio duration | |
| Overall score (1–5) | |
| Clarity (1–5) | |
| Pacing (1–5) | |
| Pronunciation (1–5) | |
| Prosody (1–5) | |
| Listening fatigue (1–5) | |
| Glitches | none / minor / major |
| Stability | pass / fail |
| Setup friction (1–5) | |
| Listen 20–40 min voluntarily? | yes / no |
| Notes | |

---

## Sample 04 — Messy Web Text

| Field | Value |
|---|---|
| Sample name | 04-messy-web-synthetic.txt |
| Engine/wrapper | Kokoro-FastAPI |
| Voice used | af_bella |
| Generated file name | |
| Generation start time | |
| Generation end time | |
| Audio duration | |
| Overall score (1–5) | |
| Clarity (1–5) | |
| Pacing (1–5) | |
| Pronunciation (1–5) | |
| Prosody (1–5) | |
| Listening fatigue (1–5) | |
| Glitches | none / minor / major |
| Stability | pass / fail |
| Setup friction (1–5) | |
| Listen 20–40 min voluntarily? | yes / no |
| Notes | |

---

## Pass/Fail Summary

| Gate | Threshold | Score | Pass? |
|---|---|---|---|
| Reliability | >= 4/5 | | |
| Listening quality | >= 3/5 | | |
| Setup friction | >= 3/5 | | |
| Silent corruption | none | | |
| Unusable long-form failure | none | | |
| Container crash during benchmark | none | | |

**Overall decision:** PASS / FAIL

---

## Next Step

Check the branch that applies and follow the decision tree.

- [ ] **Kokoro passes** → proceed to Phase 2: minimal local app (paste text, chunking, MP3 export)
- [ ] **Setup/UI fails** → switch to `docker compose --profile fallback up`, rerun benchmark with `ghcr.io/eduardolat/kokoro-web:latest` on port 3000
- [ ] **Audio quality fails** → try `af_heart` or `bm_lewis`, rerun a smaller benchmark (samples 01 and 03 only)
- [ ] **Reliability fails** → do not immediately switch to Piper; run fallback tournament: Piper, Chatterbox, F5-TTS, Dia
