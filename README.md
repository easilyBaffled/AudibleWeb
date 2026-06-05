# AudibleWeb — Kokoro TTS Benchmark

AudibleWeb is evaluating [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) as the primary TTS engine for a future article-to-podcast pipeline. This repo is the benchmark phase: run Kokoro locally, stress-test it with four synthetic samples, score the results, decide whether to build on it.

The Chrome extension from earlier development is preserved in git history. It is not the current focus.

---

## Prerequisites

- Docker Desktop (macOS target; Linux also works)
- ~7 GB free disk for the first image pull
- No GPU required — CPU-only

---

## Quick Start

```bash
# Step 1: pull the image first (it's ~5 GB — do this over a good connection before the benchmark)
docker compose pull

# Step 2: start Kokoro
docker compose up -d

# Step 3: open the web UI
open http://localhost:8880/web
```

That's it. Kokoro is running. Proceed to the benchmark workflow below.

To stop:
```bash
docker compose down
```

---

## Benchmark Workflow

1. Start Kokoro locally with Docker (`docker compose up -d`)
2. Open the web UI at `http://localhost:8880/web`
3. Open a file from `benchmark-samples/` in a text editor and copy its full contents
4. Paste the text into the web UI textarea
5. Set the voice to `af_bella` (see Voice Setup below)
6. Click Generate and wait for the audio to complete
7. Download the audio file and save it to `audio-output/` with a descriptive name
8. Listen to the output and fill in the corresponding scorecard in `benchmark-results.md`
9. Repeat for all four samples

---

## Voice Setup

In the web UI at `http://localhost:8880/web`, locate the voice selector and choose `af_bella`.

`af_bella` is an American English female voice rated Grade A by the Kokoro project. Community testing consistently identifies it as the best option for long-form article narration. Record the exact voice name in the scorecard regardless of which voice you use.

If `af_bella` is not available in the dropdown, use `af_heart` or `af_nova` as substitutes and note the change in the scorecard.

---

## Where Audio Lands

Generated audio should be saved manually to `audio-output/` on your local machine.

The `audio-output/` folder is tracked in git (via `.gitkeep`) but all `.wav`, `.mp3`, `.ogg`, and `.flac` files inside it are gitignored. Your audio files will never be accidentally committed.

Name files clearly, for example:
```
audio-output/01-clean-short-article-af_bella.wav
audio-output/02-long-essay-af_bella.wav
audio-output/03-fiction-dialogue-af_bella.wav
audio-output/04-messy-web-af_bella.wav
```

---

## Known Gotchas

**Use the web UI textarea, not the raw API.** Direct API calls can silently truncate text at newline characters, causing sections of the sample to be skipped without any error. The `/web` textarea handles newlines correctly.

**If words or sentences seem to be missing**, the text normalization layer may be dropping them. This is a known Kokoro-FastAPI issue. If you suspect it, try the advanced API option to disable normalization (`"normalize": false`) and regenerate.

**Strip emoji before pasting.** Emoji characters cause unnatural or broken speech output. The benchmark samples contain no emoji, but if you paste from other sources, check first.

**Always paste the full sample file.** Kokoro performs significantly worse on very short inputs (under ~10 words). The benchmark samples are sized to avoid this failure mode. Do not test with shorter excerpts.

**The first `docker compose up` may appear slow.** This is normal if the image was not pre-pulled. Run `docker compose pull` separately first so the startup is not blocked by the download.

---

## Scoring

Open `benchmark-results.md` and fill in one scorecard per sample as you go. Do not wait until all four samples are done — record observations while the listening is fresh.

The scorecard fields follow PRD §9. The key practical test for each sample:

> Would I willingly listen to this for a 20–40 minute article without getting irritated enough to stop?

If the answer is no for any sample, Kokoro does not pass as the primary engine regardless of other scores.

Score scale: 1 = unusable, 2 = technically works / unpleasant, 3 = tolerable, 4 = good enough for regular use, 5 = unusually good.

---

## Optional: Objective Metrics

The manual scorecard is the primary evaluation method. If you want objective numbers alongside the listening scores, these two tools are pip-installable and require no GPU:

```bash
pip install ttsds
pip install git+https://github.com/Takaaki-Saeki/DiscreteSpeechMetrics.git
```

After generating all four audio files, run:

```bash
# Intelligibility, prosody, and generic quality scores across the audio-output/ directory
python -c "
from ttsds import BenchmarkSuite
from ttsds.util.dataset import DirectoryDataset
suite = BenchmarkSuite(datasets=[DirectoryDataset('./audio-output')])
print(suite.run())
"
```

Record any scores in the Notes field of the relevant scorecard entries.

---

## Fallback: kokoro-web

If the Kokoro-FastAPI web UI at port 8880 is too frustrating to use, switch to the `kokoro-web` fallback. It provides a different web interface on port 3000 and is OpenAI API-compatible.

```bash
# Stop the primary container first
docker compose down

# Start the fallback
docker compose --profile fallback up -d

# Open the fallback UI
open http://localhost:3000
```

Update the Engine/wrapper field in `benchmark-results.md` to reflect whichever wrapper you used.

---

## Decision Tree

After completing all four scorecards, consult `benchmark-results.md` for the pass/fail summary. Then follow the applicable branch:

**Kokoro passes** (all hard gates met, practical listening test passes)
→ Proceed to Phase 2: minimal local app with paste-text input, chunking, and MP3 export.

**Setup or UI fails** (cannot get Docker running or web UI working)
→ Try the `kokoro-web` fallback (see above). Rerun the benchmark.

**Audio quality fails** (listening quality < 3/5 or practical test fails)
→ Try `af_heart` or `bm_lewis`. Rerun samples 01 and 03 only (short and dialogue).

**Reliability fails** (crashes, silent output, incomplete long-form generation)
→ Do not immediately switch to Piper. Run a fallback engine tournament: Piper, Chatterbox, F5-TTS, Dia.

---

## What This Is Not

This repo is not:

- a podcast generator
- a read-it-later app
- an Overcast publisher
- an RSS feed builder
- a Chrome extension (that code is in git history)
- a full TTS platform

It is a local Docker benchmark that answers one question: is Kokoro good enough, reliable enough, and low-friction enough to build the real app around?

---

## File Structure

```
benchmark-samples/          synthetic stress-test inputs
audio-output/               generated audio (gitignored, managed locally)
benchmark-results.md        scorecard template — fill this in
notes/setup-friction.md     record setup friction observations here
notes/errors.md             log any generation errors here
docker-compose.yml          Kokoro-FastAPI primary + kokoro-web fallback
```
