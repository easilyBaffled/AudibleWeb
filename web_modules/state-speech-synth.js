let changeHandlers = {};

const chr4 = () =>
    Math.random()
        .toString(16)
        .slice(-4);
/**
 * Generates a sufficiently random string.
 * Each of the resulting strings need to be unique so they can be used as keys in an object without clashing or overwriting.
 * @returns {string}
 */

const generateHandlerKey = () =>
    ''
        .concat(Date.now(), '-')
        .concat(chr4())
        .concat(chr4());
/**
 * Adds a new `changeHandler` function to the `changeHandlers` object.
 * Returns a function that will remove the `changeHandler` from the object.
 * @param {function(): *} changeHandler
 * @returns {function(): boolean}
 */

function onStateChange(changeHandler) {
    const key = generateHandlerKey();
    changeHandlers[key] = changeHandler;
    return () => delete changeHandlers[key];
}

const IDLE = Symbol('idle'),
    PROCESSING = Symbol('processing'),
    PLAYING = Symbol('playing'),
    PAUSED = Symbol('paused');
const states = {
    [IDLE]: {
        process: PROCESSING
    },
    [PROCESSING]: {
        start: PLAYING,
        end: IDLE,
        pause: PAUSED
    },
    [PLAYING]: {
        end: IDLE,
        pause: PAUSED
    },
    [PAUSED]: {
        end: IDLE,
        resume: PLAYING
    }
};
let currentState = IDLE;
function handleStateChange(event) {
    const previousState = currentState;
    const validTransition =
        states[previousState] && states[previousState][event.type];
    if (validTransition) currentState = states[previousState][event.type];
    Object.values(changeHandlers).forEach(handler =>
        handler(currentState, event.type, event, validTransition)
    );
}

function _defineProperty(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }

    return obj;
}

function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);

        if (typeof Object.getOwnPropertySymbols === 'function') {
            ownKeys = ownKeys.concat(
                Object.getOwnPropertySymbols(source).filter(function(sym) {
                    return Object.getOwnPropertyDescriptor(
                        source,
                        sym
                    ).enumerable;
                })
            );
        }

        ownKeys.forEach(function(key) {
            _defineProperty(target, key, source[key]);
        });
    }

    return target;
}

window.speechSynthesis.getVoices(); // Sometimes voices will not load right away. This is a hack to preload the voice list.

const defaultConfig = {
    voice: 'Alex',
    rate: 1,
    volume: 1
};
let config = defaultConfig;
const synth = window.speechSynthesis; //TODO: speak needs to throw when there is nothing in it

function speak(text) {
    let _ref =
            arguments.length > 1 && arguments[1] !== undefined
                ? arguments[1]
                : config,
        _ref$voice = _ref.voice,
        voice = _ref$voice === void 0 ? config.voice : _ref$voice,
        _ref$rate = _ref.rate,
        rate = _ref$rate === void 0 ? config.rate : _ref$rate,
        _ref$volume = _ref.volume,
        volume = _ref$volume === void 0 ? config.volume : _ref$volume;

    const utterance = Object.assign(new SpeechSynthesisUtterance(text), {
        voice: speechSynthesis.getVoices().find(v => v.voice === voice),
        rate,
        volume,
        onerror: handleStateChange,
        onend: handleStateChange,
        onstart: handleStateChange,
        onpause: handleStateChange,
        onresume: handleStateChange
    });
    synth.speak(utterance);
    handleStateChange({
        type: 'process',
        text,
        config: {
            voice,
            rate,
            volume
        }
    });
}
function resume() {
    synth.resume();
}
function pause() {
    synth.pause();
}
function cancel() {
    synth.cancel();
}
function configure(configOptions) {
    config = _objectSpread({}, defaultConfig, config, configOptions);
}

export {
    IDLE,
    PAUSED,
    PLAYING,
    PROCESSING,
    cancel,
    configure,
    onStateChange,
    pause,
    resume,
    speak
};
//# sourceMappingURL=state-speech-synth.js.map
