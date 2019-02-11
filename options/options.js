// Saves options to chrome.storage
function save_options() {
    var color = document.getElementById('color').value;
    var likesColor = document.getElementById('like').checked;
    chrome.storage.sync.set({
        favoriteColor: color,
        likesColor: likesColor
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function() {
            status.textContent = '';
        }, 750);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get({
        favoriteColor: 'red',
        likesColor: true
    }, function(items) {
        // document.getElementById('color').value = items.favoriteColor;
        // document.getElementById('like').checked = items.likesColor;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);




var synth = window.speechSynthesis;

function populateVoiceList() {
    if(typeof speechSynthesis === 'undefined') {
        return;
    }

    speechSynthesis.getVoices().forEach( voice => {
        var option = document.createElement('option');
        option.textContent = voice.name + ' (' + voice.lang + ')';

        if(voice.default) {
            option.textContent += ' -- DEFAULT';
        }

        option.setAttribute('data-lang', voice.lang);
        option.setAttribute('data-name', voice.name);
        document.getElementById("voiceSelect").appendChild(option);
    } );
}

populateVoiceList();
if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
}

var inputForm = document.querySelector('form');
var inputTxt = document.querySelector('input');
var voiceSelect = document.querySelector('select');

var voices = synth.getVoices();

console.log(voices)

inputForm.onsubmit = function(event) {
    event.preventDefault();

    var utterThis = new SpeechSynthesisUtterance(inputTxt.value);
    var selectedOption = voiceSelect.selectedOptions[0].getAttribute('data-name');
    for(i = 0; i < voices.length ; i++) {
        if(voices[i].name === selectedOption) {
            utterThis.voice = voices[i];
        }
    }
    utterThis.volume = 0.5;
    synth.speak(utterThis);
    inputTxt.blur();
}

const voiceSelect = document.getElementById('voiceSelect');
const sampleTextInput = document.getElementById('sampleTextInput');
const rateSelect = document.getElementById('rateSelect');
