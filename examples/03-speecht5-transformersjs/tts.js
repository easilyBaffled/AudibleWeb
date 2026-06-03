// SpeechT5 TTS via @xenova/transformers v2 (v3 doesn't support speecht5_tts yet).
// Designed to run inside a service worker (no DOM, single-threaded WASM).

export { VOICES } from './voices.js';

// Lazy import: loaded on first synthesis so the extension starts up even if
// vendor/transformers.min.js hasn't been downloaded yet (see vendor/SETUP.md).
let _pipeline = null;

async function loadPipeline() {
  if (_pipeline) return _pipeline;
  let mod;
  try {
    mod = await import('./vendor/transformers.min.js');
  } catch {
    throw new Error(
      'vendor/transformers.min.js not found. Run the curl command in vendor/SETUP.md.'
    );
  }
  mod.env.allowLocalModels  = false;
  mod.env.allowRemoteModels = true;
  mod.env.backends.onnx.wasm.proxy      = false;
  mod.env.backends.onnx.wasm.numThreads = 1;
  mod.env.backends.onnx.wasm.wasmPaths  = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/';
  _pipeline = mod.pipeline;
  return _pipeline;
}

// Speaker embedding URLs from the Xenova CMU Arctic dataset.
const SPEAKER_URLS = {
  slt: 'https://huggingface.co/datasets/Xenova/cmu-arctic-xvectors/resolve/main/cmu_us_slt_arctic.pt',
  bdl: 'https://huggingface.co/datasets/Xenova/cmu-arctic-xvectors/resolve/main/cmu_us_bdl_arctic.pt',
  clb: 'https://huggingface.co/datasets/Xenova/cmu-arctic-xvectors/resolve/main/cmu_us_clb_arctic.pt',
  rms: 'https://huggingface.co/datasets/Xenova/cmu-arctic-xvectors/resolve/main/cmu_us_rms_arctic.pt',
};

let synthesizer = null;

async function getSynthesizer(onProgress) {
  if (synthesizer) return synthesizer;
  const pipeline = await loadPipeline();
  synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts', {
    quantized: false,
    progress_callback: info => {
      if (info.status === 'progress' && info.total) {
        onProgress?.(info.loaded / info.total, `Downloading model… ${Math.round(info.loaded / info.total * 100)}%`);
      }
    },
  });
  return synthesizer;
}

function chunkText(text, maxLen = 200) {
  const sentences = text.replace(/([.?!])(\s+)/g, '$1\n').split('\n').map(s => s.trim()).filter(Boolean);
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && (cur + ' ' + s).length > maxLen) { chunks.push(cur); cur = s; }
    else { cur += (cur ? ' ' : '') + s; }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

function encodeWav(float32, sampleRate) {
  const dataLen = float32.length * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const v   = new DataView(buf);
  const str = (off, s) => [...s].forEach((c, i) => v.setUint8(off + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true);
  str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, dataLen, true);
  let off = 44;
  for (const s of float32) { v.setInt16(off, Math.max(-1, Math.min(1, s)) * 0x7fff, true); off += 2; }
  return buf;
}

export async function synthesize(text, { voice = 'slt' } = {}, onProgress = null) {
  const synth  = await getSynthesizer(onProgress);
  const chunks = chunkText(text);
  const all    = [];
  let sampleRate = 16000;

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.((i + 0.5) / chunks.length, `Chunk ${i + 1} / ${chunks.length}…`);
    const out  = await synth(chunks[i], { speaker_embeddings: SPEAKER_URLS[voice] });
    sampleRate = out.sampling_rate;
    for (const s of out.audio) all.push(s);
  }

  return { buffer: encodeWav(new Float32Array(all), sampleRate), mimeType: 'audio/wav', ext: 'wav' };
}
