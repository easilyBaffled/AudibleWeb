chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);
    if (request.method === "getSelection") {
        console.log(window.getSelection().toString());
        sendResponse({data: window.getSelection().toString()});
    } else
        sendResponse({});
});
