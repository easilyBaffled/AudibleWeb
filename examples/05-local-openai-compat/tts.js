// OpenAI-compatible TTS client — works with any local server that implements
// POST /v1/audio/speech (e.g. kokoro-fastapi, LocalAI, Ollama with TTS).
// Setup: pip install kokoro-fastapi && uvicorn kokoro_fastapi.main:app
// Docs: https://github.com/remsky/Kokoro-FastAPI

const DEFAULT_ENDPOINT = 'http://localhost:8000/v1/audio/speech';
const DEFAULT_VOICE = 'af_bella';
const DEFAULT_MODEL = 'kokoro';
const CHUNK_SIZE = 500; // characters per request

async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ endpoint: DEFAULT_ENDPOINT, voice: DEFAULT_VOICE, model: DEFAULT_MODEL }, resolve);
  });
}

function splitSentences(text) {
  return text.replace(/([.?!])(\s+)/g, '$1\n').split('\n').map(s => s.trim()).filter(Boolean);
}

function groupIntoChunks(sentences, maxLen = CHUNK_SIZE) {
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

async function synthesizeChunk(text, endpoint, voice, model) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: text, voice, response_format: 'mp3' }),
  });
  if (!res.ok) throw new Error(`TTS server error: ${res.status} ${await res.text()}`);
  return res.arrayBuffer();
}

async function playMp3(arrayBuffer) {
  const ctx = new AudioContext();
  const buffer = await ctx.decodeAudioData(arrayBuffer);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  return new Promise(resolve => { src.onended = resolve; src.start(); });
}

export async function speak(text) {
  const { endpoint, voice, model } = await getSettings();
  const chunks = groupIntoChunks(splitSentences(text));
  for (const chunk of chunks) {
    const mp3 = await synthesizeChunk(chunk, endpoint, voice, model);
    await playMp3(mp3);
  }
}
