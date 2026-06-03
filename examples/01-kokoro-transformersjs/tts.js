// Kokoro-82M TTS via @huggingface/transformers v3.
// Model (~82 MB, q8 quantized) is fetched from HuggingFace on first use and
// cached in the browser's Cache API. Subsequent uses are instant and offline.
// Requires vendor/transformers.min.js — see vendor/SETUP.md.

import { pipeline, env } from './vendor/transformers.min.js';

env.allowLocalModels = false;
env.allowRemoteModels = true;

export const VOICES = [
  { id: 'af_bella',   name: 'Bella (US Female)'  },
  { id: 'af_nicole',  name: 'Nicole (US Female)'  },
  { id: 'am_adam',    name: 'Adam (US Male)'      },
  { id: 'am_michael', name: 'Michael (US Male)'   },
  { id: 'bf_emma',    name: 'Emma (UK Female)'    },
  { id: 'bm_george',  name: 'George (UK Male)'    },
];

let synthesizer = null;

async function getSynthesizer(onProgress) {
  if (synthesizer) return synthesizer;
  synthesizer = await pipeline('text-to-speech', 'onnx-community/Kokoro-82M-v1.0', {
    dtype: 'q8',
    progress_callback: info => {
      if (info.status === 'progress' && info.total) {
        onProgress?.(info.loaded / info.total, `Downloading model… ${Math.round(info.loaded / info.total * 100)}%`);
      } else if (info.status === 'loading') {
        onProgress?.(0, `Loading ${info.name ?? 'model'}…`);
      }
    },
  });
  return synthesizer;
}

function splitSentences(text) {
  return text.replace(/([.?!])(\s+)/g, '$1\n').split('\n').map(s => s.trim()).filter(Boolean);
}

function encodeWav(float32, sampleRate) {
  const dataLen = float32.length * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
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

export async function synthesize(text, { voice = 'af_bella', speed = 1.0 } = {}, onProgress = null) {
  const synth = await getSynthesizer(onProgress);
  const chunks = splitSentences(text);
  const allSamples = [];
  let sampleRate = 24000;

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.((i + 0.5) / chunks.length, `Chunk ${i + 1} / ${chunks.length}…`);
    const out = await synth(chunks[i], { voice, speed });
    sampleRate = out.sampling_rate;
    for (const s of out.audio) allSamples.push(s);
  }

  onProgress?.(1, 'Encoding…');
  return { buffer: encodeWav(new Float32Array(allSamples), sampleRate), mimeType: 'audio/wav', ext: 'wav' };
}
