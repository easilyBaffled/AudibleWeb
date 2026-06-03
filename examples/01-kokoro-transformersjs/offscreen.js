import { speak } from './tts.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.method === 'speak') {
    speak(request.text).catch(console.error);
  }
});
