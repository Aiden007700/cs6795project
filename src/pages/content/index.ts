chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "getPageContent") {
      sendResponse({ content: document.body.innerText });
    }
  });