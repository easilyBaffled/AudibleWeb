chrome.storage.sync.get({ endpoint: 'http://localhost:8000/v1/audio/speech', voice: 'af_bella', model: 'kokoro' }, prefs => {
  document.getElementById('endpoint').value = prefs.endpoint;
  document.getElementById('voice').value = prefs.voice;
  document.getElementById('model').value = prefs.model;
});

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.sync.set({
    endpoint: document.getElementById('endpoint').value,
    voice: document.getElementById('voice').value,
    model: document.getElementById('model').value,
  }, () => {
    document.getElementById('status').textContent = 'Saved.';
    setTimeout(() => { document.getElementById('status').textContent = ''; }, 1500);
  });
});
