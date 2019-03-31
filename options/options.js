import * as synth from '/web_modules/state-speech-synth.js';

const inputForm = document.querySelector('form');
const inputTxt = document.querySelector('input');

let timeoutID;
/**
 *
 * @param {string} settingName
 */
const confirmSettingSaved = settingName => {
    // Update status to let user know options were saved.
    const status = document.getElementById('status');
    status.textContent = settingName + ' was saved.';

    clearTimeout(timeoutID);
    timeoutID = setTimeout(function() {
        status.textContent = '';
    }, 1500);
};

inputForm.addEventListener('submit', () => {
    chrome.storage.sync.get(
        ['rate', 'voice'],
        ({ rate = '1', voice = 'Alex' }) => {
            synth.speak(inputTxt.value, { voice, rate });
        }
    );
});

document.getElementById('voiceSelect').addEventListener('change', e => {
    const { value } = e.target;
    chrome.storage.sync.set({ voice: value }, () => {
        confirmSettingSaved('Voice ' + value);
        chrome.extension.sendRequest({ updateSettings: { voice: value } });
    });
});

document.getElementById('rateSelect').addEventListener('change', e => {
    const { value } = e.target;
    chrome.storage.sync.set({ rate: value }, () => {
        confirmSettingSaved('Rate ' + value);
        chrome.extension.sendRequest({ updateSettings: { rate: value } });
    });
});

chrome.storage.sync.get(['rate', 'voice'], ({ rate = '1', voice = 'Alex' }) => {
    console.log(rate, voice);
    document.getElementById('rateSelect').value = rate;
    document.getElementById('voiceSelect').value = voice;
});
