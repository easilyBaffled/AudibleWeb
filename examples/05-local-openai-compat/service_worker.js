import { speak } from './tts.js';

async function getSelectedText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.tabs.sendMessage(tab.id, { method: 'getSelection' });
  return response?.data || '';
}

chrome.commands.onCommand.addListener(async command => {
  if (command !== 'play-pause') return;
  const text = await getSelectedText();
  if (text) speak(text).catch(console.error);
});
