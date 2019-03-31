// import * as synth from 'state-speech-synth'
import * as synth from '/web_modules/state-speech-synth.js';

const errorMessage =
    "Sorry, I didn't catch that. Can you please reload the Page. Thank you.";

/**
 * Get out of deep callbacks by converting their calling functions to Promises
 * @param {function} func
 * @returns {Promise}
 */
const promisify = func =>
    new Promise((resolve, reject) => {
        try {
            func(resolve);
        } catch (e) {
            reject(e);
        }
    });

/**
 * @returns {Promise<number>}
 */
const getActiveTabId = () =>
    promisify(resolve =>
        chrome.tabs.query({ active: true, currentWindow: true }, resolve)
    ).then(tabs => tabs[0].id);

/**
 *
 * @param {number} tabId
 * @returns {Promise<Object.<string, string>>}
 */
const getSelectedText = tabId =>
    promisify(resolve =>
        chrome.tabs.sendMessage(tabId, { method: 'getSelection' }, resolve)
    ).then(({ data = errorMessage } = { data: errorMessage }) => data);

/**
 *
 * @param {string} text passed along from the previous promise
 * @returns {Promise<Object>}
 */
const getSpeakerOptions = text =>
    promisify(resolve =>
        chrome.storage.sync.get(['rate', 'voice'], resolve)
    ).then(({ rate, voice }) => ({ text, rate, voice }));

function playNewText() {
    getActiveTabId()
        .then(getSelectedText)
        .then(getSpeakerOptions)
        .then(({ text, rate, voice }) => {
            console.log({ rate, voice });
            synth.speak(text, { rate, voice });
        })
        .catch(console.error);
}

// TODO: look into encoprerating this into the state change handler below with a React Hooks `useEffect` like system
chrome.commands.onCommand.addListener(command => {
    try {
        command === 'cancel' ? synth.cancel() : playPauseAction();
    } catch (e) {
        console.error(e);
        console.log(command, playPauseAction);
    }
});

let playPauseAction = playNewText;

const changeChangeMap = {
    [synth.IDLE]: { icon: 'icons/idle.png', action: playNewText },
    [synth.PLAYING]: { icon: 'icons/play.png', action: synth.pause },
    [synth.PAUSED]: { icon: 'icons/pause.png', action: synth.resume }
};

synth.onStateChange(currentState => {
    console.log(currentState);
    try {
        const { icon, action } = changeChangeMap[currentState] || {};
        if (icon) chrome.browserAction.setIcon({ path: icon });
        if (action) playPauseAction = action;
    } catch (e) {
        console.error(e);
        console.log(currentState, synth);
    }
});
