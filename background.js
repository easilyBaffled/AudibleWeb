const errorMessage =
    "Sorry, I didn't catch that. Can you please reload the Page. Thank you.";

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

let currentState = {
    playing: false,
    paused: false,
    idle: true
};

/**
 * Values that are you passed in will be undefined and evaluate to false when checking state.
 *
 * @param {Object<string, boolean>} currentState
 * @param {boolean=} currentState.playing
 * @param {boolean=} currentState.paused
 * @param {boolean=} currentState.idle
 */
const setCurrentState = ({ playing, paused, idle }) => {
    currentState = {
        playing,
        paused,
        idle
    };
};

const playNewText = () => {
    getActiveTabId()
        .then(getSelectedText)
        .then(getSpeakerOptions)
        .then(({ text, rate, voice }) => {
            speechSynthesis.speak(createNewSpeech({ text, rate, voice }));
            setCurrentState({ playing: true });
            chrome.browserAction.setIcon({ path: 'icons/play.png' });
        })
        .catch(console.error);
};

const resumeSpeaking = () => {
    speechSynthesis.resume();
    setCurrentState({ playing: true });
    chrome.browserAction.setIcon({ path: 'icons/play.png' });
};

const pauseSpeaking = () => {
    speechSynthesis.pause();
    setCurrentState({ paused: true });
    chrome.browserAction.setIcon({ path: 'icons/pause.png' });
};

const stopPlaying = () => {
    speechSynthesis.cancel();
    setCurrentState({ idle: true });
    chrome.browserAction.setIcon({ path: 'icons/idle.png' });
};

/**
 * @param {Object<string, boolean>} possibleTransition
 * @param {boolean?} possibleTransition.play_pause
 * @param {boolean?} possibleTransition.cancel
 */
const setState = ({ play_pause, cancel }) => {
    const { playing, paused, idle } = currentState;
    const stateTransitions = {
        [play_pause && idle]: playNewText,
        [play_pause && paused]: resumeSpeaking,
        [play_pause && playing]: pauseSpeaking,
        [cancel]: stopPlaying
    };

    stateTransitions[true]();
};

chrome.commands.onCommand.addListener(command => {
    const commandKey = command.replace('/', '_'); // Command 'play/pause' is not a valid key so `replace` makes it valid, without changing the other command strings
    setState({ [commandKey]: true });
});
