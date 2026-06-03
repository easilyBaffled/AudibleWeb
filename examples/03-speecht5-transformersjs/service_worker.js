const OFFSCREEN_URL = chrome.runtime.getURL('offscreen.html');

async function ensureOffscreen() {
  const existing = await chrome.offscreen.getContexts();
  if (!existing.length) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'SpeechT5 TTS synthesis and playback',
    });
  }
}

async function getSelectedText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.tabs.sendMessage(tab.id, { method: 'getSelection' });
  return response?.data || '';
}

chrome.commands.onCommand.addListener(async command => {
  if (command !== 'play-pause') return;
  const text = await getSelectedText();
  if (!text) return;
  await ensureOffscreen();
  chrome.runtime.sendMessage({ method: 'speak', text });
});
