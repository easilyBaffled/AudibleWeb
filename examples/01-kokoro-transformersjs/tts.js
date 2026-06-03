// Meta MMS (Massively Multilingual Speech) TTS via @xenova/transformers v2.
// Each language is a separate ~40 MB ONNX model, fetched from HuggingFace on first use.
// Fully self-contained — no cross-repo tokenizer dependencies.
//
// Note: Kokoro-82M was the original intent but its HuggingFace tokenizer config
// references a gated/private Xenova repo, making it inaccessible without auth.
// MMS-TTS is Meta's open-weight multilingual TTS and is a solid replacement.

export { VOICES } from './voices.js';

import { pipeline, env } from './vendor/transformers.min.js';

env.allowLocalModels  = false;
env.allowRemoteModels = true;
env.backends.onnx.wasm.proxy      = false;
env.backends.onnx.wasm.numThreads = 1;
// Co-located dist/ ensures WASM binaries match the bundled ort version.
env.backends.onnx.wasm.wasmPaths  = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/';

const synthesizers = {};

async function getSynthesizer(lang, onProgress) {
  if (synthesizers[lang]) return synthesizers[lang];
  synthesizers[lang] = await pipeline('text-to-speech', `Xenova/mms-tts-${lang}`, {
    quantized: true,
    progress_callback: info => {
      if (info.status === 'progress' && info.total) {
        onProgress?.(info.loaded / info.total, `Downloading model… ${Math.round(info.loaded / info.total * 100)}%`);
      }
    },
  });
  return synthesizers[lang];
}

function splitSentences(text) {
  return text.replace(/([.?!])(\s+)/g, '$1\n').split('\n').map(s => s.trim()).filter(Boolean);
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

// speed is not supported by MMS-TTS and is ignored.
export async function synthesize(text, { voice = 'eng' } = {}, onProgress = null) {
  const synth  = await getSynthesizer(voice, onProgress);
  const chunks = splitSentences(text);
  const all    = [];
  let sampleRate = 16000;

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.((i + 0.5) / chunks.length, `Chunk ${i + 1} / ${chunks.length}…`);
    const out  = await synth(chunks[i]);
    sampleRate = out.sampling_rate;
    for (const s of out.audio) all.push(s);
  }

  return { buffer: encodeWav(new Float32Array(all), sampleRate), mimeType: 'audio/wav', ext: 'wav' };
}
