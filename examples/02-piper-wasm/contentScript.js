chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.method === "getSelection") {
    sendResponse({ data: window.getSelection().toString() });
  } else {
    sendResponse({});
  }
});
