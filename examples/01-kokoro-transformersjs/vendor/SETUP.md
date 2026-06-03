# Setup: download transformers.js

Chrome MV3 extensions cannot load scripts from external URLs, so the library
must be stored locally. Run this once from this directory:

```bash
curl -Lo transformers.min.js \
  "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js"
```

The file is ~2 MB. Each MMS language model (~40 MB quantized) is fetched
automatically from HuggingFace on first use and cached in the browser's
Cache API — subsequent uses are instant.

Note: Kokoro-82M was the original target but its tokenizer_config.json on
HuggingFace references a cross-repo dependency (Xenova/kokoro-en-v0_19) that
requires authentication and is not publicly accessible.
