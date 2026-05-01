(function () {
  if (document.getElementById("ds-fab")) return;

  const MODAL_W = 380;
  const MODAL_H = 580;
  const FAB_SIZE = 52;
  const GAP = 10;

  // ── Create FAB ──
  const fab = document.createElement("div");
  fab.id = "ds-fab";
  fab.textContent = "DS";
  document.body.appendChild(fab);

  // ── Create Modal ──
  const modal = document.createElement("div");
  modal.id = "ds-modal";
  const iframe = document.createElement("iframe");
  iframe.id = "ds-iframe";
  iframe.src = chrome.runtime.getURL("overlay.html");
  modal.appendChild(iframe);
  document.body.appendChild(modal);

  // ── Badge ──
  const badge = document.createElement("div");
  badge.id = "ds-badge";
  badge.style.cssText = `
    position:absolute;top:-6px;right:-6px;width:18px;height:18px;
    border-radius:50%;background:#e94560;border:2px solid #fff;
    display:none;align-items:center;justify-content:center;
    font-size:10px;font-weight:700;color:#fff;pointer-events:none;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  `;
  fab.style.position = "fixed";
  fab.appendChild(badge);

  // ── Config / Global Enable ──
  let extensionEnabled = true; // optimistic default while config loads

  function applyConfig(config) {
    if (!config) return;
    const salesperson = null; // will be checked after sign in via storage
    chrome.storage.local.get(["salespersonName"], (result) => {
      const name = (result.salespersonName || "").toLowerCase();
      const globalEnabled = config.enabled === true;
      const userEnabled = config.users && name
        ? config.users[name]?.enabled !== false
        : true;
      extensionEnabled = globalEnabled && userEnabled;
      fab.style.display = extensionEnabled ? "flex" : "none";
      if (!extensionEnabled && isOpen) closeModal();

      // Show launch message if present and not yet seen
      if (extensionEnabled && config.message) {
        chrome.storage.local.get(["lastSeenMessage"], (r) => {
          if (r.lastSeenMessage !== config.message) {
            showLaunchMessage(config.message);
            chrome.storage.local.set({ lastSeenMessage: config.message });
          }
        });
      }
    });
  }

  function showLaunchMessage(message) {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position:fixed;bottom:100px;right:24px;
      background:linear-gradient(135deg,#1a5296,#112f63);
      border:0.5px solid rgba(255,255,255,0.2);
      border-radius:16px;padding:14px 18px;
      color:#fff;font-size:13px;font-weight:500;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);
      z-index:999997;max-width:300px;line-height:1.5;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      display:flex;align-items:flex-start;gap:10px;
    `;
    toast.innerHTML = `
      <div style="font-size:20px;flex-shrink:0">🚀</div>
      <div>
        <div style="font-weight:700;margin-bottom:4px;color:#fff">DealerScan</div>
        <div style="color:rgba(255,255,255,0.8)">${message}</div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 8000);
  }

  // Load config on init
  chrome.storage.local.get(["dsConfig"], (result) => {
    if (result.dsConfig) applyConfig(result.dsConfig);
  });

  // Listen for config updates from background
  try {
    chrome.runtime.onMessage.addListener((request) => {
      if (request.action === "configUpdated") applyConfig(request.config);
    });
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.dsConfig) applyConfig(changes.dsConfig.newValue);
    });
  } catch (e) {}

  // ── Badge ──
  function updateBadge() {
    try {
      chrome.storage.local.get(["unseenCount", "notificationTimestamp", "userRole"], (result) => {
        if (result.userRole !== "manager") return;
        const count = result.unseenCount || 0;
        const ts = result.notificationTimestamp || 0;
        const age = Date.now() - ts;
        if (count > 0 && age < 5 * 60 * 1000) {
          badge.textContent = count > 9 ? "9+" : count;
          badge.style.display = "flex";
        } else {
          badge.style.display = "none";
          if (count > 0 && age >= 5 * 60 * 1000) chrome.storage.local.set({ unseenCount: 0 });
        }
      });
    } catch (e) {}
  }

  updateBadge();
  setInterval(updateBadge, 30000);

  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.unseenCount || changes.notificationTimestamp) updateBadge();
    });
  } catch (e) {}

  // ── Restore FAB position ──
  let fabX, fabY;

  chrome.storage.local.get("fabPosition", (result) => {
    try {
      if (result.fabPosition) {
        fabX = result.fabPosition.x;
        fabY = result.fabPosition.y;
      } else {
        fabX = window.innerWidth - FAB_SIZE - 24;
        fabY = window.innerHeight - FAB_SIZE - 80;
      }
      applyFabPosition();
    } catch (e) {}
  });

  function applyFabPosition() {
    fab.style.left = fabX + "px";
    fab.style.top = fabY + "px";
    fab.style.right = "auto";
    fab.style.bottom = "auto";
    if (isOpen) positionModal();
  }

  // ── Position modal ──
  function positionModal() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let mx = fabX - MODAL_W - GAP;
    if (mx < 8) mx = fabX + FAB_SIZE + GAP;
    mx = Math.max(8, Math.min(vw - MODAL_W - 8, mx));
    let my = fabY;
    if (my + MODAL_H > vh - 8) my = vh - MODAL_H - 8;
    my = Math.max(8, my);
    modal.style.left = mx + "px";
    modal.style.top = my + "px";
    const fabCX = fabX + FAB_SIZE / 2;
    const fabCY = fabY + FAB_SIZE / 2;
    const originX = fabCX < mx + MODAL_W / 2 ? "left" : "right";
    const originY = fabCY < my + MODAL_H / 2 ? "top" : "bottom";
    modal.style.transformOrigin = `${originY} ${originX}`;
  }

  // ── Drag ──
  let dragging = false, dragOffsetX = 0, dragOffsetY = 0, hasDragged = false;
  let dragStartX = 0, dragStartY = 0;

  fab.addEventListener("mousedown", (e) => {
    dragging = true; hasDragged = false;
    const rect = fab.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    fab.style.transition = "none";
    modal.style.transition = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (!hasDragged && Math.sqrt(dx*dx + dy*dy) < 5) return;
    hasDragged = true;
    fabX = Math.max(0, Math.min(window.innerWidth - FAB_SIZE, e.clientX - dragOffsetX));
    fabY = Math.max(0, Math.min(window.innerHeight - FAB_SIZE, e.clientY - dragOffsetY));
    fab.style.left = fabX + "px";
    fab.style.top = fabY + "px";
    if (isOpen) positionModal();
  });

  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    fab.style.transition = "";
    modal.style.transition = "";
    if (hasDragged) {
      try { chrome.storage.local.set({ fabPosition: { x: fabX, y: fabY } }); } catch (e) {}
    }
  });

  // ── Toggle modal ──
  let isOpen = false;
  let pendingCustomerName = null;

  // ── Tab title detection ──
  function extractCustomerFromTitle(title) {
    const match = title.match(/^\d+\s*\|\s*(.+)$/);
    if (match) return match[1].trim();
    return null;
  }

  function handleTitleChange(title) {
    const name = extractCustomerFromTitle(title);
    if (name) {
      if (isOpen && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ action: "customerName", name }, "*");
      } else {
        pendingCustomerName = name;
      }
    } else {
      // Left a deal page — clear suggestion
      pendingCustomerName = null;
      if (isOpen && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ action: "clearCustomer" }, "*");
      }
    }
  }

  // Observe tab title changes
  let lastTitle = document.title;
  handleTitleChange(lastTitle); // fire immediately on load
  const titleEl = document.querySelector("title");
  if (titleEl) {
    new MutationObserver(() => {
      const title = document.title;
      if (title !== lastTitle) {
        lastTitle = title;
        handleTitleChange(title);
      }
    }).observe(titleEl, { childList: true });
  }

  fab.addEventListener("click", () => {
    if (hasDragged || !extensionEnabled) return;
    if (isOpen) {
      closeModal();
    } else {
      isOpen = true;
      fab.classList.add("open");
      positionModal();
      modal.classList.add("visible");
      iframe.contentWindow.postMessage({ action: "pageActivated" }, "*");
      // Fire pending customer name if one was detected while panel was closed
      if (pendingCustomerName) {
        const name = pendingCustomerName;
        pendingCustomerName = null;
        setTimeout(() => {
          iframe.contentWindow.postMessage({ action: "customerName", name }, "*");
        }, 400);
      }
      try { chrome.storage.local.set({ unseenCount: 0 }); badge.style.display = "none"; } catch(e) {}
    }
  });

  function closeModal() {
    if (!isOpen) return;
    isOpen = false;
    fab.classList.remove("open");
    modal.classList.remove("visible");
    modal.classList.add("closing");
    setTimeout(() => { modal.classList.remove("closing"); }, 300);
  }

  // ── Messages from iframe ──
  window.addEventListener("message", async (e) => {
    if (e.source !== iframe.contentWindow) return;
    if (e.data.action === "getCustomerName") {
      iframe.contentWindow.postMessage({ action: "customerName", name: extractCustomerName() }, "*");
    }
    if (e.data.action === "injectFiles") {
      try {
        await openDealJacketThenInject(e.data.files);
        iframe.contentWindow.postMessage({ action: "injectSuccess" }, "*");
      } catch (err) {
        iframe.contentWindow.postMessage({ action: "injectError", error: err.message }, "*");
      }
    }
    if (e.data.action === "closeModal") closeModal();
  });

  window.addEventListener("resize", () => { if (isOpen) positionModal(); });

})();

// ── Customer name ──
function extractCustomerName() {
  const nameLabelEl = document.querySelector('[class*="sales_customersHeaderItem_nameLabelStyle"]');
  if (nameLabelEl) {
    const span = nameLabelEl.querySelector('span');
    if (span && span.textContent.trim()) return span.textContent.trim();
    if (nameLabelEl.textContent.trim()) return nameLabelEl.textContent.trim();
  }
  const selectors = [".customer-name", "[data-testid='customer-name']", ".deal-customer-name"];
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el && el.textContent.trim()) return el.textContent.trim();
  }
  return null;
}

// ── Tekion injection ──
async function openDealJacketThenInject(fileDataArray) {
  const existingInput = document.querySelector('input[type="file"]');
  if (existingInput) return injectFilesIntoTekion(fileDataArray);
  const trigger = document.querySelector('[class*="sales_DeskingHeader_headerItemDealNumber"]');
  if (!trigger) throw new Error("Could not find the Deal Jacket. Make sure you are on a deal page.");
  trigger.click();
  const fileInput = await waitForElement('input[type="file"]', 6000);
  if (!fileInput) throw new Error("Deal Jacket opened but file input not found.");
  return injectFilesIntoTekion(fileDataArray);
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) { resolve(existing); return; }
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { observer.disconnect(); clearTimeout(timer); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });
}

async function injectFilesIntoTekion(fileDataArray) {
  const fileInput = document.querySelector('input[type="file"]');
  if (!fileInput) throw new Error("No file input found. Please make sure the Deal Jacket is open.");
  const dataTransfer = new DataTransfer();
  for (const fileData of fileDataArray) {
    const base64 = fileData.data.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    dataTransfer.items.add(new File([bytes.buffer].map(b => new Blob([b])), fileData.name, { type: fileData.type }));
  }
  fileInput.files = dataTransfer.files;
  fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  fileInput.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}
