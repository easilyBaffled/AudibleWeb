# Setup: download transformers.js

Chrome MV3 extensions cannot load scripts from external URLs, so the library
must be stored locally. Run this once from this directory:

```bash
curl -Lo transformers.min.js \
  "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js"
```

The file is ~2 MB. The SpeechT5 model (~75 MB) is fetched automatically
from HuggingFace on first use and cached in the browser's IndexedDB.
