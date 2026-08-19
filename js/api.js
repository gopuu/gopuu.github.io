/*
 * GitHub Pages -> Apps Script bridge.
 *
 * Why a bridge?
 * Apps Script ContentService responses are redirected to a googleusercontent
 * URL and do not provide a normal configurable CORS header. This project
 * therefore embeds a tiny Apps Script HTML-service page and communicates with
 * it using postMessage. The bridge page uses google.script.run, which is the
 * supported Apps Script client/server mechanism.
 */

const CRM_API = (() => {
  let requestSeq = 0;
  const pending = new Map();
  let readyResolve;
  let readyReject;
  const ready = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  const iframe = () => document.getElementById("gasBridge");

  function init() {
    const url = CRM_CONFIG.GAS_WEB_APP_URL;
    if (!url || url.includes("PASTE_YOUR")) {
      setConnection(false, "Configure API URL");
      return;
    }

    window.addEventListener("message", onMessage);
    iframe().addEventListener("load", () => {
      // The bridge sends "CRM_BRIDGE_READY".
    });

    iframe().src = url + "?bridge=1";
    setTimeout(() => {
      if (![...pending.values()].length) {
        // Don't reject here: bridge may still be loading.
      }
    }, 5000);
  }

  function onMessage(event) {
    const data = event.data || {};
    if (data.type === "CRM_BRIDGE_READY") {
      setConnection(true, "Connected");
      readyResolve(true);
      return;
    }

    if (data.type !== "CRM_BRIDGE_RESPONSE") return;

    const item = pending.get(data.requestId);
    if (!item) return;
    pending.delete(data.requestId);

    if (data.ok) item.resolve(data.result);
    else item.reject(new Error(data.error || "Server error"));
  }

  function setConnection(ok, label) {
    const el = document.getElementById("connectionBadge");
    if (!el) return;
    el.className = "badge rounded-pill " + (ok ? "text-bg-success" : "text-bg-secondary");
    el.textContent = label;
  }

  function call(action, payload = {}) {
    return ready.then(() => new Promise((resolve, reject) => {
      const requestId = "r" + Date.now() + "_" + (++requestSeq);
      pending.set(requestId, { resolve, reject });

      iframe().contentWindow.postMessage({
        type: "CRM_BRIDGE_REQUEST",
        requestId,
        action,
        payload
      }, "*");

      setTimeout(() => {
        if (pending.has(requestId)) {
          pending.delete(requestId);
          reject(new Error("Request timed out."));
        }
      }, 30000);
    }));
  }

  return { init, call };
})();
