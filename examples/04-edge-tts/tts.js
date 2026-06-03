// Edge TTS — uses Microsoft's production neural TTS endpoint (same engine as Edge browser's Read Aloud).
// No API key required. Communicates via WebSocket using the edge-tts protocol.
// See: https://github.com/rany2/edge-tts for the protocol spec (Python reference impl).

const WSS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'; // public token used by Edge browser
const VOICE = 'en-US-JennyNeural';
const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

function uuid() {
  return crypto.randomUUID().replace(/-/g, '');
}

function timestamp() {
  return new Date().toISOString().replace(/:/g, '-').replace('Z', '');
}

function buildSsml(text, voice) {
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
    `<voice name='${voice}'><prosody rate='+0%' pitch='+0Hz'>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</prosody></voice></speak>`;
}

function synthesizeChunk(text, voice = VOICE) {
  return new Promise((resolve, reject) => {
    const reqId = uuid();
    const ws = new WebSocket(`${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`);
    ws.binaryType = 'arraybuffer';

    const audioChunks = [];

    ws.onopen = () => {
      // Send speech config
      ws.send(
        `X-Timestamp:${timestamp()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({ context: { synthesis: { audio: { metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false }, outputFormat: OUTPUT_FORMAT } } } })
      );
      // Send SSML
      ws.send(
        `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp()}\r\nPath:ssml\r\n\r\n` +
        buildSsml(text, voice)
      );
    };

    ws.onmessage = event => {
      if (event.data instanceof ArrayBuffer) {
        // Binary: strip the header before the audio payload
        const view = new Uint8Array(event.data);
        const separator = new TextEncoder().encode('Path:audio\r\n\r\n');
        let offset = 0;
        for (let i = 0; i <= view.length - separator.length; i++) {
          if (separator.every((b, j) => view[i + j] === b)) { offset = i + separator.length; break; }
        }
        audioChunks.push(event.data.slice(offset));
      } else if (typeof event.data === 'string' && event.data.includes('Path:turn.end')) {
        ws.close();
        const total = audioChunks.reduce((n, c) => n + c.byteLength, 0);
        const merged = new Uint8Array(total);
        let pos = 0;
        for (const c of audioChunks) { merged.set(new Uint8Array(c), pos); pos += c.byteLength; }
        resolve(merged.buffer);
      }
    };

    ws.onerror = reject;
  });
}

function splitSentences(text) {
  return text.replace(/([.?!])(\s+)/g, '$1\n').split('\n').map(s => s.trim()).filter(Boolean);
}

async function playMp3(arrayBuffer) {
  const ctx = new AudioContext();
  const buffer = await ctx.decodeAudioData(arrayBuffer);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  return new Promise(resolve => { src.onended = resolve; src.start(); });
}

export async function speak(text, voice = VOICE) {
  for (const chunk of splitSentences(text)) {
    const mp3 = await synthesizeChunk(chunk, voice);
    await playMp3(mp3);
  }
}
