const inputForm = document.querySelector('form');
const inputTxt = document.querySelector('input');

/**
 *
 * @param {Object} options
 * @param {string} options.text
 * @param {number} options.rate
 * @param {string} options.voice
 * @returns {SpeechSynthesisUtterance}
 */
const createNewSpeech = ({ text, voice = 'Alex', rate = 1 }) =>
    Object.assign(new SpeechSynthesisUtterance(text), {
        voice: speechSynthesis.getVoices().find(v => v.voice === voice),
        rate,
        volume: 1
    });

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
    chrome.storage.sync.get(['rate', 'voice'], ({rate, voice}) => {
        speechSynthesis.speak( createNewSpeech( { text: inputTxt.value, voice, rate } ) );
    });
} );

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
