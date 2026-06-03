// Synthesis runs here so it survives the popup being closed.
// A repeating alarm every 20 s keeps this service worker alive during long jobs.

import { synthesize } from './tts.js';

// ── Keep-alive alarm ──────────────────────────────────────────────────────────

chrome.alarms.create('keepAlive', { periodInMinutes: 1 / 3 }); // every ~20 s
chrome.alarms.onAlarm.addListener(() => { /* intentionally empty — just keeps SW awake */ });

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('tts-jobs', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('jobs', { keyPath: 'id' });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function saveBuffer({ buffer, mimeType, ext }) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('jobs', 'readwrite');
    const req = tx.objectStore('jobs').put({ id: 'current', buffer, mimeType, ext });
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Job state helpers ─────────────────────────────────────────────────────────

function setJob(job) {
  chrome.storage.local.set({ job });
  // Notify popup if it's open (errors are fine — popup may be closed).
  chrome.runtime.sendMessage({ type: 'JOB_UPDATE', job }).catch(() => {});
}

function setBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// ── Synthesis ─────────────────────────────────────────────────────────────────

async function runSynthesis(text, params) {
  try {
    setJob({ status: 'running', progress: 0, message: 'Starting…' });
    setBadge('…', '#888');

    const result = await synthesize(text, params, (progress, message) => {
      const job = { status: 'running', progress, message };
      setJob(job);
    });

    await saveBuffer(result);
    const job = { status: 'done', ext: result.ext, mimeType: result.mimeType };
    setJob(job);
    setBadge('✓', '#188038');
  } catch (e) {
    const job = { status: 'error', error: e.message };
    setJob(job);
    setBadge('!', '#c5221f');
  }
}

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'START_SYNTHESIS') {
    runSynthesis(msg.text, msg.params);
    sendResponse({ ok: true });
  }
  return false;
});
