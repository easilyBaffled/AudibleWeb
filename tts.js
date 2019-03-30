const splitSentences = str =>
    str
        .replace(/([.?!])( *)/g, '$1|')
        .split('|')
        .filter(v => v);
