import { VOICES, synthesize } from './tts.js';

const voiceSelect = document.getElementById('voice');
VOICES.forEach(({ id, name }) => {
  const opt = document.createElement('option');
  opt.value = id;
  opt.textContent = name;
  voiceSelect.appendChild(opt);
});

const speedSlider = document.getElementById('speed');
const speedVal = document.getElementById('speedVal');
speedSlider.addEventListener('input', () => { speedVal.textContent = `${speedSlider.value}×`; });

const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progress');
const status = document.getElementById('status');

let result = null;

generateBtn.addEventListener('click', async () => {
  const text = document.getElementById('text').value.trim();
  if (!text) return;

  generateBtn.disabled = true;
  downloadBtn.style.display = 'none';
  progressWrap.style.display = 'block';
  progressBar.removeAttribute('value'); // indeterminate
  result = null;

  try {
    result = await synthesize(
      text,
      { voice: voiceSelect.value, speed: parseFloat(speedSlider.value) },
      (fraction, message) => {
        status.textContent = message || 'Synthesizing…';
        if (fraction > 0) {
          progressBar.value = fraction;
          progressBar.max = 1;
        } else {
          progressBar.removeAttribute('value');
        }
      }
    );
    const kb = (result.buffer.byteLength / 1024).toFixed(0);
    status.textContent = `Ready — ${kb} KB (.${result.ext})`;
    downloadBtn.style.display = 'block';
  } catch (e) {
    status.textContent = `Error: ${e.message}`;
  } finally {
    generateBtn.disabled = false;
    progressWrap.style.display = 'none';
  }
});

downloadBtn.addEventListener('click', () => {
  if (!result) return;
  const blob = new Blob([result.buffer], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tts-output.${result.ext}`;
  a.click();
  URL.revokeObjectURL(url);
});
