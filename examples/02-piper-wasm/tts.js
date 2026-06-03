// Piper TTS via WebAssembly — based on ken107/piper-browser-extension.
// Voice model (.onnx) and config (.json) are fetched once and cached in IndexedDB.
// piper-worker.js (bundled from github.com/ken107/piper-browser-extension) runs
// the WASM inference on a dedicated Worker thread.

const VOICE_MODEL_URL =
  'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx';
const VOICE_CONFIG_URL =
  'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json';

let worker = null;
let pendingCallbacks = {};
let msgId = 0;

function getWorker() {
  if (worker) return worker;
  worker = new Worker(chrome.runtime.getURL('piper/piper-worker.js'));
  worker.onmessage = ({ data }) => {
    const cb = pendingCallbacks[data.id];
    if (cb) {
      delete pendingCallbacks[data.id];
      cb(data);
    }
  };
  return worker;
}

function workerCall(type, payload) {
  return new Promise(resolve => {
    const id = ++msgId;
    pendingCallbacks[id] = resolve;
    getWorker().postMessage({ id, type, ...payload });
  });
}

async function fetchWithCache(url, cacheName = 'piper-voices-v1') {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(url);
  if (cached) return cached.arrayBuffer();
  await cache.add(url);
  return (await cache.match(url)).arrayBuffer();
}

let modelLoaded = false;

async function ensureModel() {
  if (modelLoaded) return;
  const [modelData, configText] = await Promise.all([
    fetchWithCache(VOICE_MODEL_URL),
    fetch(VOICE_CONFIG_URL).then(r => r.text()),
  ]);
  await workerCall('load', { modelData, config: JSON.parse(configText) });
  modelLoaded = true;
}

function splitSentences(text) {
  return text
    .replace(/([.?!])(\s+)/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

async function playPcm(pcmData, sampleRate) {
  const ctx = new AudioContext({ sampleRate });
  const float32 = new Float32Array(pcmData);
  const buffer = ctx.createBuffer(1, float32.length, sampleRate);
  buffer.copyToChannel(float32, 0);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  return new Promise(resolve => {
    src.onended = resolve;
    src.start();
  });
}

export async function speak(text) {
  await ensureModel();
  const chunks = splitSentences(text);
  for (const chunk of chunks) {
    const result = await workerCall('synthesize', { text: chunk });
    await playPcm(result.audio, result.sampleRate);
  }
}
