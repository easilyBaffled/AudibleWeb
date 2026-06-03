// Edge TTS — Microsoft's production neural TTS, same engine as Edge browser Read Aloud.
// Communicates via WebSocket; works natively in a service worker with no extra libraries.

export { VOICES } from './voices.js';

const WSS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const TOKEN   = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

function uuid() { return crypto.randomUUID().replace(/-/g, ''); }
function ts()   { return new Date().toISOString().replace(/:/g, '-').replace('Z', ''); }

function ratePercent(speed) {
  const p = Math.round((speed - 1) * 100);
  return p >= 0 ? `+${p}%` : `${p}%`;
}

function buildSsml(text, voice, speed) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
    `<voice name='${voice}'><prosody rate='${ratePercent(speed)}' pitch='+0Hz'>${esc}</prosody></voice></speak>`;
}

function synthesizeChunk(text, voice, speed) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WSS_URL}?TrustedClientToken=${TOKEN}`);
    ws.binaryType = 'arraybuffer';
    const parts = [];

    ws.onopen = () => {
      ws.send(
        `X-Timestamp:${ts()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({ context: { synthesis: { audio: {
          metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
          outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        }}}})
      );
      ws.send(
        `X-RequestId:${uuid()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts()}\r\nPath:ssml\r\n\r\n` +
        buildSsml(text, voice, speed)
      );
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

    ws.onerror = e => reject(new Error(`WebSocket error: ${e.message ?? 'unknown'}`));
  });
}

function splitSentences(text) {
  return text.replace(/([.?!])(\s+)/g, '$1\n').split('\n').map(s => s.trim()).filter(Boolean);
}

export async function synthesize(text, { voice = 'en-US-JennyNeural', speed = 1.0 } = {}, onProgress = null) {
  const chunks  = splitSentences(text);
  const buffers = [];

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.((i + 0.5) / chunks.length, `Chunk ${i + 1} / ${chunks.length}…`);
    buffers.push(await synthesizeChunk(chunks[i], voice, speed));
  }

  const total  = buffers.reduce((n, b) => n + b.byteLength, 0);
  const merged = new Uint8Array(total);
  let pos = 0;
  for (const b of buffers) { merged.set(new Uint8Array(b), pos); pos += b.byteLength; }

  return { buffer: merged.buffer, mimeType: 'audio/mpeg', ext: 'mp3' };
}
