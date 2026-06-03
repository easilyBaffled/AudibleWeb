// Synthesis runs here so it survives the popup being closed.
// Edge TTS WebSocket is run inside a real webpage (via executeScript + world:'MAIN')
// so the Origin header is the page URL, not chrome-extension://, avoiding the 403.

import { splitSentences } from './tts.js';

const TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

// ── Keep-alive alarm ──────────────────────────────────────────────────────────

chrome.alarms.create('keepAlive', { periodInMinutes: 1 / 3 });
chrome.alarms.onAlarm.addListener(() => {});

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
  chrome.runtime.sendMessage({ type: 'JOB_UPDATE', job }).catch(() => {});
}

function setBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// ── Edge TTS page script ──────────────────────────────────────────────────────
// This function is injected into a real webpage so the WebSocket Origin header
// is the page's URL (e.g. https://example.com) rather than chrome-extension://.
// Microsoft's speech endpoint rejects chrome-extension:// origins with 403.
// The function is self-contained — no closures over service worker variables.

function edgeTTSInPage(chunks, voice, speed, token) {
  function uuid() { return crypto.randomUUID().replace(/-/g, ''); }
  function ts() { return new Date().toISOString().replace(/:/g, '-').replace('Z', ''); }
  function pct(s) { const p = Math.round((s - 1) * 100); return p >= 0 ? `+${p}%` : `${p}%`; }

  function ssml(text, voice, speed) {
    const e = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>`
      + `<voice name='${voice}'><prosody rate='${pct(speed)}' pitch='+0Hz'>${e}</prosody></voice></speak>`;
  }

  function synthesizeChunk(text) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(
        `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1`
        + `?TrustedClientToken=${token}&ConnectionId=${uuid()}`
      );
      ws.binaryType = 'arraybuffer';
      const parts = [];

      ws.onopen = () => {
        ws.send(`X-Timestamp:${ts()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n`
          + JSON.stringify({ context: { synthesis: { audio: {
              metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
              outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
            }}}}));
        ws.send(`X-RequestId:${uuid()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts()}\r\nPath:ssml\r\n\r\n`
          + ssml(text, voice, speed));
      };

      ws.onmessage = event => {
        if (event.data instanceof ArrayBuffer) {
          const view = new Uint8Array(event.data);
          const sep  = new TextEncoder().encode('Path:audio\r\n\r\n');
          let offset = 0;
          for (let i = 0; i <= view.length - sep.length; i++) {
            if (sep.every((b, j) => view[i + j] === b)) { offset = i + sep.length; break; }
          }
          parts.push(event.data.slice(offset));
        } else if (typeof event.data === 'string' && event.data.includes('Path:turn.end')) {
          ws.close();
          const total = parts.reduce((n, p) => n + p.byteLength, 0);
          const out   = new Uint8Array(total);
          let pos = 0;
          for (const p of parts) { out.set(new Uint8Array(p), pos); pos += p.byteLength; }
          resolve(out.buffer);
        }
      };

      ws.onerror = () => reject(new Error('WebSocket error'));
      ws.onclose = ev => { if (!ev.wasClean) reject(new Error(`WS closed (${ev.code})`)); };
    });
  }

  return (async () => {
    const buffers = [];
    for (const chunk of chunks) buffers.push(await synthesizeChunk(chunk));
    const total  = buffers.reduce((n, b) => n + b.byteLength, 0);
    const merged = new Uint8Array(total);
    let pos = 0;
    for (const b of buffers) { merged.set(new Uint8Array(b), pos); pos += b.byteLength; }
    return merged.buffer;
  })();
}

// ── Find a usable webpage tab ─────────────────────────────────────────────────

async function findWebTab() {
  // Prefer the active tab; fall back to any HTTP/HTTPS tab.
  const patterns = ['https://*/*', 'http://*/*'];
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true, url: patterns });
  if (!tab) {
    [tab] = await chrome.tabs.query({ url: patterns });
  }
  if (!tab) throw new Error('No open webpage tab found. Open any website and try again.');
  return tab;
}

// ── Synthesis ─────────────────────────────────────────────────────────────────

async function runSynthesis(text, { voice = 'en-US-JennyNeural', speed = 1.0 } = {}) {
  try {
    setJob({ status: 'running', progress: 0, message: 'Starting…' });
    setBadge('…', '#888');

    const chunks = splitSentences(text);
    const tab    = await findWebTab();

    const [{ result: audioBuffer }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func:   edgeTTSInPage,
      args:   [chunks, voice, speed, TOKEN],
      world:  'MAIN',
    });

    if (!audioBuffer) throw new Error('No audio returned from page script');

    const result = { buffer: audioBuffer, mimeType: 'audio/mpeg', ext: 'mp3' };
    await saveBuffer(result);
    setJob({ status: 'done', ext: 'mp3', mimeType: 'audio/mpeg' });
    setBadge('✓', '#188038');
  } catch (e) {
    setJob({ status: 'error', error: e.message });
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
