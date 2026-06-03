import { VOICES } from './voices.js';

// Populate voice dropdown from voices.js (doesn't load the heavy ML library).
const voiceSelect = document.getElementById('voice');
VOICES.forEach(({ id, name }) => {
  const opt = document.createElement('option');
  opt.value = id;
  opt.textContent = name;
  voiceSelect.appendChild(opt);
});

const speedSlider = document.getElementById('speed');
const speedVal   = document.getElementById('speedVal');
speedSlider.addEventListener('input', () => { speedVal.textContent = `${speedSlider.value}×`; });

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('tts-jobs', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('jobs', { keyPath: 'id' });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function getJobBuffer() {
  const db  = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('jobs', 'readonly');
    const req = tx.objectStore('jobs').get('current');
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────

const formView    = document.getElementById('formView');
const statusView  = document.getElementById('statusView');
const hint        = document.getElementById('hint');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progress');
const statusMsg   = document.getElementById('statusMsg');
const errorMsg    = document.getElementById('errorMsg');
const downloadBtn = document.getElementById('downloadBtn');

function showForm() {
  formView.style.display   = '';
  statusView.style.display = 'none';
}

function showStatus(job) {
  formView.style.display   = 'none';
  statusView.style.display = '';
  errorMsg.style.display   = 'none';
  downloadBtn.style.display = 'none';
  progressWrap.style.display = '';

  if (job.status === 'running') {
    hint.textContent = 'Working in background — safe to close this popup.';
    progressBar.value = job.progress ?? 0;
    statusMsg.textContent = job.message ?? 'Synthesizing…';
  } else if (job.status === 'done') {
    hint.textContent = '';
    progressWrap.style.display = 'none';
    downloadBtn.style.display = 'block';
    downloadBtn.textContent = `⬇ Download .${job.ext}`;
    downloadBtn.dataset.ext      = job.ext;
    downloadBtn.dataset.mimeType = job.mimeType;
  } else if (job.status === 'error') {
    hint.textContent = '';
    progressWrap.style.display = 'none';
    errorMsg.style.display = 'block';
    errorMsg.textContent = `Error: ${job.error}`;
  }
}

function applyUpdate(job) {
  if (!job || job.status === 'idle') { showForm(); return; }
  showStatus(job);
}

// ── Init: read current job state ──────────────────────────────────────────────

chrome.storage.local.get('job', ({ job }) => applyUpdate(job ?? null));

// Listen for live updates from service worker while popup is open.
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'JOB_UPDATE') applyUpdate(msg.job);
});

// ── Generate ──────────────────────────────────────────────────────────────────

document.getElementById('generateBtn').addEventListener('click', () => {
  const text = document.getElementById('text').value.trim();
  if (!text) return;
  chrome.runtime.sendMessage({
    type:   'START_SYNTHESIS',
    text,
    params: { voice: voiceSelect.value, speed: parseFloat(speedSlider.value) },
  });
  showStatus({ status: 'running', progress: 0, message: 'Starting…' });
});

// ── Download ──────────────────────────────────────────────────────────────────

downloadBtn.addEventListener('click', async () => {
  const record = await getJobBuffer();
  if (!record?.buffer) return;
  const blob = new Blob([record.buffer], { type: downloadBtn.dataset.mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `tts-output.${downloadBtn.dataset.ext}`,
  });
  a.click();
  URL.revokeObjectURL(url);
});

// ── New job ───────────────────────────────────────────────────────────────────

document.getElementById('newJobBtn').addEventListener('click', () => {
  chrome.storage.local.set({ job: { status: 'idle' } });
  showForm();
});
