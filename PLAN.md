# Implementation Plan: Kokoro MVP TTS Benchmark
**Branch:** `claude/festive-sagan-QV00r`
**Repo:** `easilybaffled/audibleweb`
**Mantra:** configure > implement · compose > customize · benchmark > build

---

## Overview

Pivot the AudibleWeb repo root to host a local Docker-based Kokoro TTS benchmark.
Goal: validate whether Kokoro is good enough to be the primary TTS engine for a future
article-to-podcast pipeline. This is NOT the podcast app — it is an evaluation harness.

Existing Chrome extension files (`manifest.json`, `background.js`, `contentScript.js`,
`options/`, `icons/`, `web_modules/`) are left completely untouched.

Custom code written: **zero**. Everything is configuration, documentation, and content.

---

## Stack (assembled from research, not built)

| Layer | Tool | Source |
|---|---|---|
| TTS server (primary) | Kokoro-FastAPI CPU | `ghcr.io/remsky/kokoro-fastapi-cpu:latest` |
| TTS server (fallback) | kokoro-web | `ghcr.io/eduardolat/kokoro-web:latest` |
| Web UI | Built into Kokoro-FastAPI at `/web` | Ships with image |
| Long-text chunking | Auto-stitching built into Kokoro-FastAPI | Configured via env vars |
| Voice | `af_bella` (American Female, Grade A) | Community consensus for long-form |
| Objective metrics (optional) | `ttsds` + `DiscreteSpeechMetrics` UTMOS | pip install, no GPU needed |

---

## Final File Structure

```
AudibleWeb/
  README.md                                        ← REPLACED
  docker-compose.yml                               ← NEW
  benchmark-samples/
    01-clean-short-article-synthetic.txt           ← NEW (~1,500 words)
    02-long-essay-synthetic.txt                    ← NEW (~5,000 words)
    03-fiction-dialogue-synthetic.txt              ← NEW (~3,000 words)
    04-messy-web-synthetic.txt                     ← NEW (~2,000 words)
  audio-output/
    .gitkeep                                       ← NEW
  benchmark-results.md                             ← NEW
  notes/
    setup-friction.md                              ← NEW
    errors.md                                      ← NEW
  [manifest.json, background.js, contentScript.js, options/, icons/, web_modules/ — untouched]
```

---

## Phase 0 — Branch Verification

**Step 0.1** Confirm on correct branch.
```bash
git branch --show-current
# Expected output: claude/festive-sagan-QV00r
```
✅ Verification gate: output matches. Already confirmed — we are on the correct branch.

---

## Phase 1 — .gitignore Update

**Step 1.1** Add audio output patterns to `.gitignore` so generated audio files are never
accidentally committed.

Append to existing `.gitignore`:
```
# Kokoro benchmark audio output
audio-output/*.wav
audio-output/*.mp3
audio-output/*.ogg
audio-output/*.flac
```

✅ Verification gate:
```bash
git check-ignore -v audio-output/test.wav
# Expected: .gitignore:[line]:audio-output/*.wav  audio-output/test.wav
```

---

## Phase 2 — docker-compose.yml

**Step 2.1** Create `docker-compose.yml` at repo root.

Contents:
- **Primary service `kokoro`:** `ghcr.io/remsky/kokoro-fastapi-cpu:latest`
  - Port: `8880:8880`
  - Volume: `./audio-output:/app/output` (so generated files land on host)
  - Env vars for auto-stitching token window:
    - `TARGET_MIN_TOKENS=175`
    - `TARGET_MAX_TOKENS=250`
    - `ABSOLUTE_MAX_TOKENS=450`
  - `restart: unless-stopped`
- **Fallback service `kokoro-web`:** `ghcr.io/eduardolat/kokoro-web:latest`
  - Profile-gated: `profiles: [fallback]` — only starts if explicitly requested
  - Port: `3000:3000`
  - Env: `KW_PUBLIC_NO_TRACK=true` (analytics opt-out)

✅ Verification gate:
```bash
docker compose config
# Expected: valid YAML printed, no errors
```

---

## Phase 3 — Directory Scaffolding

**Step 3.1** Create `audio-output/.gitkeep` so the folder is tracked by git even though
the audio files inside it are gitignored.

**Step 3.2** Create `notes/setup-friction.md` — template for recording setup friction
observations during the benchmark run.

Contents:
```markdown
# Setup Friction Notes

## Environment
- OS:
- Docker version:
- Date:

## Steps attempted
<!-- Document each step and whether it was clear -->

## Friction score: [1-5]
<!-- 1=dependency hell, 5=effortless -->

## Would you call this setup "acceptable"?
<!-- Per PRD §12: Docker startup understandable, UI opens, model not confusing,
     audio repeatable, errors diagnosable, restart works -->
yes / no

## Notes
```

**Step 3.3** Create `notes/errors.md` — error log template.

Contents:
```markdown
# Error Log

## [Error title]
- **When:** [step in benchmark workflow]
- **Command / action:**
- **Error message:**
- **Resolution:**
- **Impact on benchmark:**
```

✅ Verification gate:
```bash
ls -la audio-output/ notes/
# Expected: .gitkeep in audio-output/, setup-friction.md and errors.md in notes/
```

---

## Phase 4 — Benchmark Sample Files

All four files go in `benchmark-samples/`. They are static `.txt` files — generated
once and committed. Benchmark is repeatable.

### Step 4.1 — `01-clean-short-article-synthetic.txt`

**Purpose:** Basic article-reader viability test.
**Target:** ~1,500 words
**Topic:** "How Cities Decide to Build a New Subway Line" (neutral, factual)
**Structure:** Intro → 4 sections with clear headings → conclusion
**Must include:**
- Clear H2-style headings (written as plain text labels, not Markdown `##`)
- Normal paragraphs with moderate sentence length
- Acronyms: MTA, EIS, ROI, NIMBY
- Numbers: costs in billions, percentages, years
- No weird formatting, no emoji, no URLs, no Markdown residue

✅ Verification gate:
```bash
wc -w benchmark-samples/01-clean-short-article-synthetic.txt
# Expected: 1200–1800
grep -c "." benchmark-samples/01-clean-short-article-synthetic.txt
# Expected: > 20 lines (not one big blob)
```

---

### Step 4.2 — `02-long-essay-synthetic.txt`

**Purpose:** Long-form stability and listener fatigue test.
**Target:** ~5,000 words
**Topic:** "The Long Economic Tail of Automation: A 30-Year View" (argumentative)
**Structure:** 8 sections, numbered arguments within sections
**Must include:**
- Complex nested sentences with multiple subordinate clauses
- Parentheticals: "(see Figure 3, p. 47)", "(emphasis mine)", "(hereafter: the Model)"
- Acronyms: GDP, IMF, OECD, WTO, AI, ML
- Em dashes for asides — like this — throughout
- Numbered arguments: "First, … Second, … Third, …"
- Section transitions: "Having established X, we turn now to…"
- Footnote-style inline references: [1], [2], [cf. Smith 2019]
- Block quotations (introduced with a colon, indented as plain text)

✅ Verification gate:
```bash
wc -w benchmark-samples/02-long-essay-synthetic.txt
# Expected: 4500–5500
grep -c "—" benchmark-samples/02-long-essay-synthetic.txt
# Expected: > 5 (em dashes present)
```

---

### Step 4.3 — `03-fiction-dialogue-synthetic.txt`

**Purpose:** Narration flow, dialogue handling, quote nesting, prosody test.
**Target:** ~3,000 words
**Characters:** Dr. Miriam Voss, Callum Reed (two scientists at a remote research station)
**Structure:** Scene-setting → dialogue exchanges → internal monologue → climax beat
  → scene break `* * *` → coda
**Must include:**
- Dialogue with attribution: `"You lied to me," she said.`
- Nested quotes: `"He told me 'trust the data,'" Callum said, "and I believed him."`
- Em dashes for interruptions: `"I never said—" "You did."`
- Short emotional beats: one- or two-word paragraphs
- Long descriptive passages: 5–8 sentences of physical environment
- Character name repetition (for pronunciation consistency test)

✅ Verification gate:
```bash
wc -w benchmark-samples/03-fiction-dialogue-synthetic.txt
# Expected: 2500–3500
grep -c '"' benchmark-samples/03-fiction-dialogue-synthetic.txt
# Expected: > 20 (dialogue present)
grep -c '\* \* \*' benchmark-samples/03-fiction-dialogue-synthetic.txt
# Expected: 1 (scene break present)
```

---

### Step 4.4 — `04-messy-web-synthetic.txt`

**Purpose:** Stress-test Kokoro on pasted web cruft. Expose failures before praising quality.
**Target:** ~2,000 words
**Topic:** Synthetic "scraped productivity app review article"
**Must include (deliberately):**
- Markdown headings: `## Why This Matters`, `### The Verdict`
- Inline Markdown links: `[read more](https://example.com/article-slug)`
- Raw URLs mid-sentence: `Visit https://www.productname.io/pricing for details.`
- HTML residue: `<br>`, `&amp;`, `&mdash;`, `<!-- comment -->`
- Bullet lists (plain hyphens)
- A fake table: `| Feature | Free | Pro |` with `|---|---|---|` separator
- Code-like inline text: `` `cmd+shift+p` ``, `$PATH`, `npm install`
- Footnote markers: [^1], [^2], with stub footnote text at bottom
- Odd spacing: double spaces, trailing spaces, blank lines mid-paragraph
- Repeated boilerplate block: "Subscribe to our newsletter · Share · Tweet · Save"
  appearing twice
- Weird punctuation chains: `...`, `–`, `″`, `′`, `®`, `™`

✅ Verification gate:
```bash
wc -w benchmark-samples/04-messy-web-synthetic.txt
# Expected: 1500–2500
grep -c 'https://' benchmark-samples/04-messy-web-synthetic.txt
# Expected: >= 2 (URLs present)
grep -c '<' benchmark-samples/04-messy-web-synthetic.txt
# Expected: >= 2 (HTML residue present)
grep -c '\[' benchmark-samples/04-messy-web-synthetic.txt
# Expected: >= 3 (footnote markers or Markdown links present)
```

---

## Phase 5 — Scorecard Template

**Step 5.1** Create `benchmark-results.md`.

Structure:
1. **Run metadata block** — date, engine, image tag, voice, hardware, Docker version
2. **Four scorecard tables** — one per sample, all 14 fields from PRD §9:
   - Sample name, Engine/wrapper, Voice used, Generated file name
   - Generation start time, Generation end time, Audio duration
   - Overall score 1–5
   - Clarity 1–5
   - Pacing 1–5
   - Pronunciation 1–5
   - Prosody 1–5
   - Listening fatigue 1–5
   - Glitches: none / minor / major
   - Stability: pass / fail
   - Setup friction 1–5
   - Would listen voluntarily 20–40 min? yes / no
   - Notes (free text)
3. **Pass/fail summary table** — all 6 hard gates from PRD §10 with threshold, score, pass/fail columns
4. **Overall decision line** — `PASS` or `FAIL`
5. **Next step checklist** — the 4-branch decision tree from PRD §14

✅ Verification gate:
```bash
grep -c "| Sample name" benchmark-results.md
# Expected: 4 (one per sample)
grep -c "## Pass/Fail" benchmark-results.md
# Expected: 1
grep -c "Reliability" benchmark-results.md
# Expected: >= 1
```

---

## Phase 6 — README (written last)

**Step 6.1** Replace existing `README.md`.

Sections in order:
1. **What this repo is** — 3 sentences. AudibleWeb pivoted to Kokoro benchmark. Chrome extension code is in git history.
2. **Prerequisites** — Docker Desktop (macOS), ~7GB free disk for image pull
3. **Quick start**
   ```bash
   docker compose pull        # ~5GB, do this first over good connection
   docker compose up -d
   open http://localhost:8880/web
   ```
4. **First-pull warning** — image is ~5GB; separate `pull` step so compose startup doesn't appear frozen
5. **Benchmark workflow** (the 7 steps from PRD §6, verbatim, with file paths filled in)
6. **Voice setup** — in the `/web` UI, set voice to `af_bella`
7. **Where audio lands** — `audio-output/` on your host machine (gitignored, manage locally)
8. **Known gotchas** (from research red flags):
   - Use the `/web` textarea, not raw API calls — raw API silently truncates at newlines
   - If words seem missing, disable normalization in the request payload
   - Strip emoji from input text before pasting
   - Short snippets (<10 words) will sound worse than full paragraphs — always paste the full sample file
9. **Scoring** — open `benchmark-results.md`, fill it in as you go
10. **Optional: objective metrics**
    ```bash
    pip install ttsds
    pip install git+https://github.com/Takaaki-Saeki/DiscreteSpeechMetrics.git
    # After generating audio:
    python -c "from ttsds import BenchmarkSuite; from ttsds.util.dataset import DirectoryDataset; suite = BenchmarkSuite(datasets=[DirectoryDataset('./audio-output')]); print(suite.run())"
    ```
11. **Fallback: kokoro-web** — if the Kokoro-FastAPI web UI is too frustrating:
    ```bash
    docker compose --profile fallback up -d
    open http://localhost:3000
    ```
12. **Decision tree** — condensed from PRD §14 (Kokoro passes → next phase; setup fails → kokoro-web; audio quality fails → try af_heart; reliability fails → fallback tournament)
13. **What this is NOT** — explicit callout from PRD: no RSS, no Overcast, no Chrome extension work, no podcast pipeline

✅ Verification gate:
```bash
grep -c "docker compose" README.md
# Expected: >= 3 (pull, up, fallback commands all documented)
grep -c "af_bella" README.md
# Expected: >= 1
grep -c "localhost:8880" README.md
# Expected: >= 1
wc -l README.md
# Expected: > 50 (substantive doc, not a stub)
```

---

## Phase 7 — Commit and Push

**Step 7.1** Stage all new and modified files explicitly (no `git add -A`):
```bash
git add .gitignore docker-compose.yml README.md benchmark-results.md
git add benchmark-samples/ audio-output/ notes/
```

✅ Verification gate:
```bash
git status
# Expected: all listed files in "Changes to be committed"
# Expected: no unintended files staged (no extension source files modified)
git diff --cached --name-only | sort
# Expected output (exactly these paths, no more):
#   .gitignore
#   README.md
#   audio-output/.gitkeep
#   benchmark-results.md
#   benchmark-samples/01-clean-short-article-synthetic.txt
#   benchmark-samples/02-long-essay-synthetic.txt
#   benchmark-samples/03-fiction-dialogue-synthetic.txt
#   benchmark-samples/04-messy-web-synthetic.txt
#   docker-compose.yml
#   notes/errors.md
#   notes/setup-friction.md
```

**Step 7.2** Commit:
```bash
git commit -m "$(cat <<'EOF'
Add Kokoro MVP TTS benchmark scaffold

Pivots repo to local Docker-based Kokoro benchmark. Assembles
Kokoro-FastAPI (CPU), four synthetic stress-test samples, scorecard
template, and setup docs. Zero custom TTS code — configure > implement.

https://claude.ai/code/session_013bV7edzEvLSyWDGuJUemA5
EOF
)"
```

✅ Verification gate:
```bash
git log --oneline -1
# Expected: commit message visible, correct hash
git show --stat HEAD | tail -20
# Expected: 11 files changed, all expected paths
```

**Step 7.3** Push:
```bash
git push -u origin claude/festive-sagan-QV00r
```

✅ Verification gate:
```bash
git status
# Expected: "Your branch is up to date with 'origin/claude/festive-sagan-QV00r'"
```

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Extension files accidentally modified | Only stage named files; verify with `git diff --cached --name-only` before commit |
| Audio output volume path wrong in container | Document fallback in README: if `/app/output` wrong, check Kokoro-FastAPI docs for actual output path |
| `af_bella` voice not present in image | README instructs: open `/web`, check voice dropdown, substitute `af_heart` or `af_nova` |
| Port 8880 already in use locally | README: `lsof -i :8880` to find conflict; `docker compose down` any old containers |
| Long samples silently truncated | Token chunking env vars in compose target the safe 100–250 token range; README gotchas section warns |
| `docker compose pull` appears frozen | README: separate pull step with warning; image is legitimately ~5GB |

---

## Non-Goals (explicitly out of scope)

- RSS feed generation
- GitHub Pages publishing
- Overcast integration
- Chrome extension modifications
- EPUB/PDF import
- Custom web UI
- Custom chunking system
- Voice leaderboard
- Podcast pipeline
- Background job queue
- ASR/transcript validation
- Piper fallback
- Multi-voice comparison

---

## Success Criteria

The implementation is complete when:
- [ ] `docker compose up` starts Kokoro with no errors
- [ ] `http://localhost:8880/web` opens in browser
- [ ] All 4 benchmark sample files exist and hit word count targets
- [ ] `benchmark-results.md` has 4 scorecard tables + pass/fail summary
- [ ] `README.md` covers quick start, workflow, gotchas, scoring, fallback
- [ ] All verification gates above pass
- [ ] Commit pushed to `claude/festive-sagan-QV00r`
- [ ] Zero extension source files modified
