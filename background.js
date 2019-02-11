let playing = false;
const errorMessage = "Sorry, I didn't catch that. Can you please reload the Page. Thank you.";

/**
 *
 * @param {Object} options
 * @param {string} options.text
 * @param {number} options.rate
 * @param {number} options.pitch
 * @returns {SpeechSynthesisUtterance}
 */
const createNewSpeech = ({ text, pitch, rate }) =>
    Object.assign( new SpeechSynthesisUtterance(text), { pitch, rate, volume: 1 } );

/**
 * Convert any function with a callback to a Promise
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

const getTabId = () => promisify( resolve => chrome.tabs.query({ active: true, currentWindow: true }, resolve ) );

const sendMessage = tabId =>
    promisify(resolve =>
        chrome.tabs.sendMessage(tabId, { method: 'getSelection' }, resolve)
    );

const getSettings = () => promisify(resolve =>
    chrome.storage.sync.get(['favoriteColor', 'likesColor'], resolve)
);

chrome.commands.onCommand.addListener(command => {
    console.log('onCommand event received for message: ', command);
    if (command === 'cancel') {
        speechSynthesis.cancel();
        chrome.browserAction.setIcon({ path: 'icons/idle.png' });
    }
    if (command === 'play/pause') {
        if (speechSynthesis.speaking && playing) {
            speechSynthesis.pause();
            playing = false;
            chrome.browserAction.setIcon({ path: 'icons/pause.png' });
        } else if (speechSynthesis.speaking && !playing) {
            speechSynthesis.resume();
            playing = true;
            chrome.browserAction.setIcon({ path: 'icon/play.png' });
        } else {
            getTabId()
                .then( tabs => tabs[0].id )
                .then( sendMessage )
                .then( response => {
                    getSettings()
                        .then(function(result) {
                            console.log(result);
                            console.log('Value currently is ' + result.key);
                        })
                        .catch(console.error);


                    console.log(response);
                    if (!response)
                        response = {
                            data: errorMessage
                        };
                    const selectedText = response.data;
                    if (selectedText.length < 1) return;
                    speechSynthesis.speak(
                        createNewSpeech({
                            text: selectedText,
                            pitch: 1,
                            rate: 1.7
                        })
                    );
                    playing = true;
                    chrome.browserAction.setIcon({
                        path: 'icons/play.png'
                    });
                } )



        }
    }
});
