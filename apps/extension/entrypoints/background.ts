export default defineBackground(() => {
  // Setup context menu on install
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'add-to-vocabulary',
      title: 'Add "%s" to Vocabulary',
      contexts: ['selection'],
    });
  });

  // Handle context menu click
  chrome.contextMenus.onClicked.addListener(
    (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
      if (info.menuItemId === 'add-to-vocabulary' && tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'OPEN_QUICK_ADD',
          selectedText: info.selectionText,
        });
      }
    },
  );

  // Proxy API requests from content scripts to avoid Mixed Content / CSP / CORS
  chrome.runtime.onMessage.addListener(
    (message: any, sender, sendResponse) => {
      if (message?.type === 'API_PROXY_REQUEST') {
        handleApiProxyRequest(message.endpoint, message.options)
          .then((result) => sendResponse({ success: true, data: result }))
          .catch((err) =>
            sendResponse({
              success: false,
              error: err.message,
              status: err.status || 0,
              code: err.code || 'API_ERROR',
            }),
          );
        return true; // Keep message channel open for async response
      }
    },
  );
});

async function handleApiProxyRequest(endpoint: string, options?: RequestInit) {
  // Try localhost:4000, then fallback to 127.0.0.1:4000
  const baseUrls = ['http://localhost:4000/v1', 'http://127.0.0.1:4000/v1'];
  let lastError: any = null;

  for (const base of baseUrls) {
    try {
      const res = await fetch(`${base}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!res.ok) {
        let errBody: any = {};
        try {
          errBody = await res.json();
        } catch {
          // non-JSON
        }
        const err = errBody?.error || {};
        const error: any = new Error(
          err.message || `Request failed with status ${res.status}`,
        );
        error.status = res.status;
        error.code = err.code || 'API_ERROR';
        throw error;
      }

      if (res.status === 204) return {};
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    } catch (err: any) {
      lastError = err;
      // If it was a network error (e.g. connection refused), try next base URL
      if (
        err.name === 'TypeError' ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError')
      ) {
        continue;
      }
      // If it was an HTTP error (4xx/5xx), throw immediately
      throw err;
    }
  }

  throw (
    lastError ||
    new Error('Cannot connect to API server. Make sure the backend is running.')
  );
}
