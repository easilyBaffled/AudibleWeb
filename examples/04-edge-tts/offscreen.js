import { speak } from './tts.js';

chrome.runtime.onMessage.addListener((request) => {
  if (request.method === 'speak') {
    speak(request.text).catch(console.error);
  }
});
