// SpeechT5 TTS via transformers.js (Microsoft).
// Model (~75 MB) fetched from HuggingFace on first use and cached in IndexedDB.
// Requires vendor/transformers.min.js — see vendor/SETUP.md.

import { pipeline, env } from './vendor/transformers.min.js';

env.allowLocalModels = false;
env.useBrowserCache = true;

// SpeechT5 uses speaker embeddings rather than named voices.
// These are preset indices from the CMU speaker dataset included with the model.
export const VOICES = [
  { id: '7306', name: 'Speaker A (default)' },
  { id: '1580', name: 'Speaker B'           },
  { id: '3729', name: 'Speaker C'           },
  { id: '6829', name: 'Speaker D'           },
];

let synthesizer = null;

async function getSynthesizer(onProgress) {
  if (synthesizer) return synthesizer;
  synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts', {
    quantized: false,
    progress_callback: info => {
      if (info.status === 'downloading') {
        onProgress?.(info.progress / 100, `Downloading model… ${Math.round(info.progress)}%`);
      }
    },
  });
  return synthesizer;
}

// SpeechT5 handles short inputs best (~200 chars per chunk).
function chunkText(text, maxLen = 200) {
  const sentences = text.replace(/([.?!])(\s+)/g, '$1\n').split('\n').map(s => s.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if (current && (current + ' ' + s).length > maxLen) { chunks.push(current); current = s; }
    else { current += (current ? ' ' : '') + s; }
  }
  if (current) chunks.push(current);
  return chunks;
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

// speed is not supported by SpeechT5 — ignored here.
export async function synthesize(text, { voice = '7306' } = {}, onProgress = null) {
  const synth = await getSynthesizer(onProgress);
  const chunks = chunkText(text);
  const allSamples = [];
  let sampleRate = 16000;

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.((i + 0.5) / chunks.length, `Chunk ${i + 1} / ${chunks.length}…`);
    const out = await synth(chunks[i], {
      speaker_embeddings: `https://huggingface.co/datasets/Xenova/cmu-arctic-xvectors/resolve/main/cmu_us_${voice}_arctic.pt`,
    });
    sampleRate = out.sampling_rate;
    for (const s of out.audio) allSamples.push(s);
  }

  onProgress?.(1, 'Encoding…');
  return { buffer: encodeWav(new Float32Array(allSamples), sampleRate), mimeType: 'audio/wav', ext: 'wav' };
}
