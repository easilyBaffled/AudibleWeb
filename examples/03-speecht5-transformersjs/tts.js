// SpeechT5 TTS via transformers.js — Microsoft's transformer-based TTS model.
// Model (~75MB) fetched from HuggingFace and cached in IndexedDB on first run.
// Speaker embeddings give voice variety without a server.

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

env.allowLocalModels = false;
env.useBrowserCache = true;

let synthesizer = null;

async function getSynthesizer() {
  if (!synthesizer) {
    synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts', {
      quantized: false,
    });
  }
  return synthesizer;
}

// SpeechT5 works best with short inputs (~200 chars).
function chunkText(text, maxLen = 200) {
  const sentences = text.replace(/([.?!])(\s+)/g, '$1\n').split('\n').map(s => s.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + ' ' + s).length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += (current ? ' ' : '') + s;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

async function playFloat32(float32Array, sampleRate) {
  const ctx = new AudioContext({ sampleRate });
  const buffer = ctx.createBuffer(1, float32Array.length, sampleRate);
  buffer.copyToChannel(float32Array, 0);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  return new Promise(resolve => {
    src.onended = resolve;
    src.start();
  });
}

export async function speak(text) {
  const synth = await getSynthesizer();
  const chunks = chunkText(text);
  for (const chunk of chunks) {
    // speaker_embeddings defaults to 'Xenova/speecht5_hifigan' vocoder speaker 7306.
    const output = await synth(chunk, { speaker_embeddings: 'Xenova/speecht5_tts' });
    await playFloat32(output.audio, output.sampling_rate);
  }
}
