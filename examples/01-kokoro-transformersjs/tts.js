// Kokoro TTS engine using transformers.js — runs entirely in the browser via WebGPU/WASM.
// Model (~92MB quantized) is fetched from HuggingFace on first use and cached in IndexedDB.

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

env.allowLocalModels = false;
env.useBrowserCache = true;

let synthesizer = null;
let audioCtx = null;

async function getSynthesizer() {
  if (!synthesizer) {
    synthesizer = await pipeline('text-to-speech', 'Xenova/kokoro-en-v0_19', {
      quantized: true,
    });
  }
  return synthesizer;
}

// Split on sentence boundaries, keeping the delimiter attached.
function splitSentences(text) {
  return text
    .replace(/([.?!])(\s+)/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

// Decode Float32 PCM → play via Web Audio API.
async function playFloat32(float32Array, sampleRate) {
  if (!audioCtx) audioCtx = new AudioContext();
  const buffer = audioCtx.createBuffer(1, float32Array.length, sampleRate);
  buffer.copyToChannel(float32Array, 0);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);
  return new Promise(resolve => {
    src.onended = resolve;
    src.start();
  });
}

export async function speak(text, voice = 'af_bella') {
  const synth = await getSynthesizer();
  const chunks = splitSentences(text);
  for (const chunk of chunks) {
    const output = await synth(chunk, { voice, speed: 1.0 });
    await playFloat32(output.audio, output.sampling_rate);
  }
}
