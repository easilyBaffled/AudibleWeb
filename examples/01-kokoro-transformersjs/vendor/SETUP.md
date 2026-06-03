# Setup: download transformers.js

Chrome MV3 extensions cannot load scripts from external URLs, so the library
must be stored locally. Run this once from this directory:

```bash
curl -Lo transformers.min.js \
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js"
```

Note: this uses `@huggingface/transformers` v3 (not the older `@xenova/transformers` v2).
The file is ~2 MB. The Kokoro model (~82 MB, q8 quantized) is fetched automatically
from HuggingFace on first use and cached in the browser — subsequent uses are instant.
