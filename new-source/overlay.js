const DRIVE_FOLDER_ID  = "1YOL2kFo4PG5UCDcjGH5Z62ak5mN4Jtuk";
const SYSTEM_FOLDER_ID = "1Zb8LUDFD_MA5yD_T3d34kBgCigJj6a7B";
const LOG_FILE_NAME    = "_DealerScan_Log.json";
// v3.9: IT_PASSWORD removed — IT panel now gated solely by email-based isITUser check
// v3.10: APPS_SCRIPT_URL points at new Workspace deployment (under tgchevydocs@dealerscanapp.com)
const APPS_SCRIPT_URL  = "https://script.google.com/macros/s/AKfycbzF13p-WRJloMRBoWiQ4h6EmR7iylkVoGxX0Y9PBpEN0RacIvfxoN_Hd15NJUSYpsQJug/exec";

// ── Event logging ──

// ─────────────────────────────────────────────────────────────
// Phase 4B.4: Drive proxy helper. Routes all Drive READS through
// the Apps Script backend so we don't need direct user-by-user
// folder sharing. Backend gates calls via withAuth_ + allowlist.
//
// Endpoint mapping (read-only, set by 4B.2):
//   proxyListFolders   ?parentId=X         -> {folders: [{id,name,createdAt,modifiedAt}]}
//   proxyListFiles     ?folderId=X         -> {files: [{id,name,mimeType,size,modifiedAt}]}
//   proxyReadFile      ?fileId=X           -> {base64, name, mimeType, size}
//   proxyGetFile       ?fileId=X           -> {name, mimeType, size, createdAt, modifiedAt}
//   proxyFindFolder    ?parentId=X&name=N  -> {found, folder?:{id,name}}
//   proxyReadJsonFile  ?fileName=F         -> {parsed:Object, modifiedAt}
//                                             (system folder only)
//
// All proxy calls require ?accessToken=<chrome.identity_token>.
// Returns:
//   On success: parsed object with ok:true
//   On failure: throws Error with backend message
//
// WRITE operations (createFolder, renameFolder, deleteFolder, upload)
// are ALSO routed through the proxy (proxyCreateFolder / proxyRenameFolder /
// proxyDeleteFolder / proxyUploadFile). Uploads use POST (FormData) for
// large base64 payloads; the rest use GET via proxyFetch.
// APPS_SCRIPT_URL is declared once at the top of this file (see line 6).
// ─────────────────────────────────────────────────────────────

async function proxyFetch(action, params, token) {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set("action", action);
  url.searchParams.set("accessToken", token);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== null && v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) throw new Error(`proxy HTTP ${res.status} (${action})`);
  const data = await res.json();
  if (!data.ok) {
    const msg = data.error || "unknown_proxy_error";
    // Auth failures throw a distinguishable error so callers can refresh token
    if (msg === "invalid_access_token" || msg === "missing_access_token") {
      const e = new Error("proxy_auth_failed: " + msg);
      e.code = "auth";
      throw e;
    }
    throw new Error(`proxy ${action}: ${msg}`);
  }
  return data;
}

function logEvent(type, details = {}) {
  const event = { type, salesperson: salespersonName, timestamp: new Date().toISOString(), ...details };
  try { chrome.runtime.sendMessage({ action: "writeEvent", event }); } catch (e) {}
  try {
    const url = APPS_SCRIPT_URL + "?action=logEvent&payload=" + encodeURIComponent(JSON.stringify(event));
    fetch(url, { redirect: "follow" }).catch(() => {});
  } catch (e) {}
}

// ── State ──
let selectedFolderId = null;
let selectedFolderName = "";
let salespersonName = "";
let userRole = "salesperson";
let isITUser = false;
let lockedToOwn = false;
let extraFiles = [];
let cfFiles = [];
let currentCustomerName = "";
let currentFolderActionId = null;
let currentFolderActionName = "";
let itTapCount = 0;
let itTapTimer = null;
// v3.9: re-upload confirmation state
let pendingReuploadConfirm = false;
let pendingReuploadTimer = null;
// v3.9: stash uploaded IDs until Tekion confirms injectSuccess
let pendingUploadedFileIds = null;

// v3.9: helper to reset stale per-folder state (re-upload confirm, queued extra files, button label)
function resetFolderState() {
  pendingReuploadConfirm = false;
  clearTimeout(pendingReuploadTimer);
  if (extraFiles.length > 0) {
    extraFiles = [];
    renderExtraFiles();
  }
  clearReuploadVisual();
}

// v3.9: restore upload button to neutral state (clears confirm-pending styling + label)
function clearReuploadVisual() {
  const btn = document.getElementById("uploadBtn");
  if (btn) {
    btn.classList.remove("confirm-pending");
    btn.textContent = "Upload to Tekion";
  }
}

// v3.9: translate raw errors into user-friendly text
function friendlyError(err) {
  if (!err) return "Upload failed.";
  const msg = String(err);
  if (/network|failed to fetch|connection|offline/i.test(msg)) return "Network issue. Check your connection and try again.";
  if (/401|auth|token|credential|unauthor/i.test(msg)) return "Sign-in expired. Hit Refresh and re-authenticate.";
  if (/403|permission|forbidden/i.test(msg)) return "Permission issue. Manager may need to share the folder.";
  if (/429|quota|rate.?limit/i.test(msg)) return "Google rate limit hit. Wait 30 seconds and try again.";
  if (/timeout|timed out/i.test(msg)) return "Request timed out. Refresh and retry.";
  if (/deal jacket|file input/i.test(msg)) return msg; // these are already user-friendly Tekion messages
  return "Upload failed: " + msg;
}

// v3.9: render the in-panel banner from config.message
function applyBanner(config) {
  const el = document.getElementById("dsBanner");
  const txt = document.getElementById("dsBannerText");
  if (!el || !txt) return;
  const msg = (config && config.message) ? String(config.message).trim() : "";
  if (msg) {
    txt.textContent = msg;
    el.style.display = "flex";
  } else {
    el.style.display = "none";
  }
}

// ── Messages from content.js ──
window.addEventListener("message", (e) => {
  if (e.data.action === "customerName") {
    if (e.data.name) { currentCustomerName = e.data.name; searchFolderByCustomer(e.data.name); }
  }
  if (e.data.action === "clearCustomer") {
    currentCustomerName = "";
    document.getElementById("suggestedSection").style.display = "none";
    clearFolderPreview();
    if (userRole === "manager") renderManagerRecent();
  }
  if (e.data.action === "injectSuccess") {
    // v3.9: commit uploaded file IDs only after Tekion confirms (was set pre-confirm in 3.8)
    if (pendingUploadedFileIds) {
      chrome.storage.local.set({ [pendingUploadedFileIds.key]: pendingUploadedFileIds.ids });
      pendingUploadedFileIds = null;
    }
    writeLogEntry();
    logEvent("uploadSuccess", { customer: currentCustomerName, folderName: selectedFolderName });
    hideUploadScreen();
    showUploadSuccess(selectedFolderName, selectedFileCount || 0);
    extraFiles = []; renderExtraFiles();
    clearReuploadVisual();
    document.getElementById("uploadBtn").disabled = false;
  }
  if (e.data.action === "injectError") {
    // v3.9: discard pending uploaded IDs on failure so retry isn't blocked
    pendingUploadedFileIds = null;
    clearReuploadVisual();
    hideUploadScreen();
    showStatus(friendlyError(e.data.error), "error");
    logEvent("injectFailed", { customer: currentCustomerName, folderName: selectedFolderName, error: e.data.error });
    document.getElementById("uploadBtn").disabled = false;
  }
  if (e.data.action === "pageActivated") {
    window.parent.postMessage({ action: "getCustomerName" }, "*");
    // Re-check resolved role on every page activation
    chrome.storage.local.get(["resolvedRole"], (result) => {
      if (result.resolvedRole) {
        const newRole = result.resolvedRole === "it" ? "manager" : result.resolvedRole;
        isITUser = result.resolvedRole === "it";
        if (newRole !== userRole) { userRole = newRole; applyManagerUI(); }
      }
    });
    loadFolders();
    if (userRole === "manager") {
      if (document.getElementById("suggestedSection").style.display === "none") renderManagerRecent();
    }
    logEvent("sessionStart");
  }
});

let selectedFileCount = 0;

// ── Init ──
document.addEventListener("DOMContentLoaded", async () => {
  chrome.storage.local.get(["salespersonName","onboardingDone","userRole","lockedToOwn"], async (result) => {
    salespersonName = result.salespersonName || "";
    userRole = result.userRole || "salesperson";
    lockedToOwn = result.lockedToOwn || false;
    if (result.salespersonName) document.getElementById("settingName").value = result.salespersonName;
    if (!result.onboardingDone) { showOnboarding(); } else { await initMain(); }
  });

  document.getElementById("settingsBtn").addEventListener("click", () => showScreen("settings-screen"));
  document.getElementById("closeBtn").addEventListener("click", () => window.parent.postMessage({ action: "closeModal" }, "*"));
  document.getElementById("cancelSettingsBtn").addEventListener("click", () => showScreen(null));
  document.getElementById("saveSettingsBtn").addEventListener("click", saveSettings);

  // Triple-tap IT panel trigger
  document.getElementById("itSecretTap").addEventListener("click", () => {
    itTapCount++;
    clearTimeout(itTapTimer);
    itTapTimer = setTimeout(() => { itTapCount = 0; }, 1200);
    if (itTapCount >= 3) {
      itTapCount = 0;
      // v3.9: only IT users (per email check) can access IT panel — silent no-op for everyone else
      if (!isITUser) return;
      showScreen("it-screen");
      maybeAutoOpenIT();
    }
  });

  // IT Panel
  document.getElementById("itBackBtn").addEventListener("click", () => showScreen("settings-screen"));
  document.getElementById("itUnlockBtn").addEventListener("click", tryUnlockIT);
  document.getElementById("itPassword").addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlockIT(); });
  document.getElementById("itSaveBtn").addEventListener("click", saveITSettings);
  document.getElementById("itLockBtn").addEventListener("click", lockIT);
  document.getElementById("itLockToggle").addEventListener("click", () => document.getElementById("itLockToggle").classList.toggle("on"));
  document.getElementById("globalEnableToggle").addEventListener("click", () => document.getElementById("globalEnableToggle").classList.toggle("on"));
  document.getElementById("itTestNotifBtn").addEventListener("click", testNotification);
  document.getElementById("itDebugBtn").addEventListener("click", showDebugInfo);
  document.getElementById("itEventsBtn").addEventListener("click", () => { showScreen("event-log-screen"); loadEventsData(); });
  document.getElementById("eventLogBackBtn").addEventListener("click", () => showScreen("it-screen"));
  document.getElementById("eventLogRefreshBtn").addEventListener("click", loadEventsData);
  document.querySelectorAll(".role-option").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".role-option").forEach(r => r.classList.remove("selected"));
      el.classList.add("selected");
    });
  });

  // Sales Data
  document.getElementById("salesDataBtn").addEventListener("click", () => { showScreen("sales-data-screen"); loadSalesData(); });
  document.getElementById("salesDataBackBtn").addEventListener("click", () => showScreen(null));
  document.getElementById("salesDataRefreshBtn").addEventListener("click", loadSalesData);

  // Create folder
  document.getElementById("createFolderBtn2").addEventListener("click", () => {
    cfFiles = []; renderCfFiles(); populateCfDropdowns(); showScreen("create-folder-screen");
  });
  document.getElementById("createFolderBackBtn").addEventListener("click", () => showScreen(null));
  document.getElementById("createFolderBtn").addEventListener("click", createCustomerFolder);
  document.getElementById("cf-customer").addEventListener("input", () => { updateFolderPreview(); checkDuplicateFolder(); });
  document.getElementById("cf-salesperson-select").addEventListener("change", updateFolderPreview);
  document.getElementById("cf-manager").addEventListener("change", updateFolderPreview);
  const cfZone = document.getElementById("cfDropZone");
  const cfInput = document.getElementById("cfFileInput");
  cfZone.addEventListener("click", () => cfInput.click());
  cfZone.addEventListener("dragover", (e) => { e.preventDefault(); cfZone.classList.add("drag-over"); });
  cfZone.addEventListener("dragleave", () => cfZone.classList.remove("drag-over"));
  cfZone.addEventListener("drop", (e) => { e.preventDefault(); cfZone.classList.remove("drag-over"); addCfFiles(Array.from(e.dataTransfer.files)); });
  cfInput.addEventListener("change", () => { addCfFiles(Array.from(cfInput.files)); cfInput.value = ""; });

  // Folder actions
  document.getElementById("folderActionsBackBtn").addEventListener("click", () => showScreen(null));
  document.getElementById("faArchiveBtn").addEventListener("click", archiveFolder);
  document.getElementById("faReassignBtn").addEventListener("click", () => {
    const f = document.getElementById("faReassignForm");
    f.style.display = f.style.display === "none" ? "block" : "none";
  });
  document.getElementById("faReassignConfirm").addEventListener("click", reassignFolder);
  document.getElementById("faDeleteBtn").addEventListener("click", deleteFolder);

  // Search / filter / sort
  document.getElementById("folderSearch").addEventListener("input", applyFolderControls);
  document.getElementById("filterSalesperson").addEventListener("change", applyFolderControls);
  document.getElementById("sortFolders").addEventListener("change", applyFolderControls);
});

// ── Screens ──
function showScreen(screenId) {
  ["it-screen","sales-data-screen","create-folder-screen","folder-actions-screen","event-log-screen","create-success-screen","upload-success-screen"].forEach(s => {
    document.getElementById(s).style.display = "none";
  });
  document.getElementById("app-screen").style.display = "flex";
  document.getElementById("settings-screen").style.display = "none";
  document.getElementById("main-screen").style.display = "block";
  if (!screenId) return;
  if (screenId === "settings-screen") {
    document.getElementById("settings-screen").style.display = "block";
    document.getElementById("main-screen").style.display = "none";
  } else {
    document.getElementById("app-screen").style.display = "none";
    document.getElementById(screenId).style.display = "flex";
  }
}

// ── Settings ──
function saveSettings() {
  const name = document.getElementById("settingName").value.trim();
  if (!name) { showStatus("Please enter a name.", "error"); return; }
  salespersonName = name;
  chrome.storage.local.set({ salespersonName: name, cachedFolders: [] });
  showScreen(null); loadFolders();
}

// ── IT Panel ──
function tryUnlockIT() {
  // v3.9: only email-verified IT users can unlock — password removed
  if (!isITUser) {
    document.getElementById("itError").style.display = "block";
    document.getElementById("itError").textContent = "Not authorized. IT access is granted by email.";
    return;
  }
  document.getElementById("it-lock").style.display = "none";
  document.getElementById("it-panel").style.display = "block";
  document.getElementById("itError").style.display = "none";
  chrome.storage.local.get(["userRole","lockedToOwn","salespersonName","dsConfig"], (result) => {
    document.querySelectorAll(".role-option").forEach(el =>
      el.classList.toggle("selected", el.dataset.role === (result.userRole || "salesperson"))
    );
    document.getElementById("itNameOverride").value = result.salespersonName || "";
    document.getElementById("itLockToggle").classList.toggle("on", !!result.lockedToOwn);
    const config = result.dsConfig || { enabled: false, message: "", users: {} };
    document.getElementById("globalEnableToggle").classList.toggle("on", !!config.enabled);
    document.getElementById("launchMessage").value = config.message || "";
    renderUserToggles(config);
  });
}

// Auto-open IT panel for verified IT users (skip triple-tap + password)
function maybeAutoOpenIT() {
  if (!isITUser) return;
  document.getElementById("it-lock").style.display = "none";
  document.getElementById("it-panel").style.display = "block";
  tryUnlockIT();
}

function lockIT() {
  document.getElementById("it-panel").style.display = "none";
  document.getElementById("it-lock").style.display = "block";
  document.getElementById("itPassword").value = "";
}

function saveITSettings() {
  const selected = document.querySelector(".role-option.selected");
  const role = selected ? selected.dataset.role : "salesperson";
  const nameOverride = document.getElementById("itNameOverride").value.trim();
  const locked = document.getElementById("itLockToggle").classList.contains("on");
  const updates = { userRole: role, lockedToOwn: locked };
  if (nameOverride) { updates.salespersonName = nameOverride; salespersonName = nameOverride; }
  userRole = role; lockedToOwn = locked;
  const globalEnabled = document.getElementById("globalEnableToggle").classList.contains("on");
  const message = document.getElementById("launchMessage").value.trim();
  const users = {};
  document.querySelectorAll(".user-toggle-row").forEach(row => {
    users[row.dataset.name] = { enabled: row.querySelector(".user-toggle").classList.contains("on") };
  });
  const config = { enabled: globalEnabled, message, users };
  chrome.storage.local.set(updates, () => {
    chrome.storage.local.remove("seenFolderIds");
    chrome.runtime.sendMessage({ action: "writeConfig", config }, () => {
      applyManagerUI(); loadFolders(); showScreen(null);
    });
  });
}

function renderUserToggles(config) {
  const list = document.getElementById("userToggleList");
  chrome.storage.local.get("cachedFolders", (result) => {
    const folders = result.cachedFolders || [];
    const names = [...new Set(folders.map(f => {
      const p = f.name.split("--"); return p.length >= 2 ? p[1].trim() : null;
    }).filter(Boolean))].sort();
    if (names.length === 0) {
      list.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.3);text-align:center;padding:8px">No salespeople detected yet</div>';
      return;
    }
    list.innerHTML = names.map(name => {
      const enabled = config.users?.[name]?.enabled !== false;
      return `<div class="user-toggle-row toggle-row" data-name="${name}">
        <div class="toggle-label">${name}</div>
        <div class="toggle-switch user-toggle ${enabled?"on":""}"><div class="toggle-knob"></div></div>
      </div>`;
    }).join("");
    list.querySelectorAll(".user-toggle").forEach(t => t.addEventListener("click", () => t.classList.toggle("on")));
  });
}

function testNotification() {
  const btn = document.getElementById("itTestNotifBtn");
  btn.textContent = "Testing..."; btn.disabled = true;
  chrome.storage.local.get(["unseenCount"], (r) => {
    chrome.storage.local.set({ unseenCount: (r.unseenCount||0)+1, notificationTimestamp: Date.now() }, () => {
      setTimeout(() => { btn.textContent = "✓ Close panel & check FAB badge"; btn.disabled = false; }, 500);
    });
  });
}

function showDebugInfo() {
  const btn = document.getElementById("itDebugBtn");
  btn.textContent = "Checking..."; btn.disabled = true;
  chrome.storage.local.get(["userRole","unseenCount","notificationTimestamp","seenFolderIds","lastNewFolders"], (s) => {
    const age = s.notificationTimestamp ? Math.round((Date.now()-s.notificationTimestamp)/1000)+"s ago" : "never";
    const lastNew = s.lastNewFolders ? s.lastNewFolders.map(f=>f.name).join(", ") : "none";
    alert(`Role: ${s.userRole||"salesperson"}\nUnseen: ${s.unseenCount||0}\nLast notification: ${age}\nFolders tracked: ${(s.seenFolderIds||[]).length}\nLast new: ${lastNew}`);
    btn.textContent = "🔍 Debug Log"; btn.disabled = false;
  });
}

// ── Manager UI ──
function applyManagerUI() {
  const isManager = userRole === "manager";
  document.querySelectorAll(".manager-only").forEach(el => el.style.display = isManager ? "flex" : "none");
  document.getElementById("foldersLabel").textContent = isManager ? "All Folders" : "My Folders";
  document.getElementById("headerSubtitle").textContent = isManager ? "Manager View" : "Drive to Tekion";
  if (isManager) { populateFilterDropdown(); }
}

function renderManagerRecent() {
  if (userRole !== "manager") return;
  if (document.getElementById("suggestedSection").style.display !== "none") return;
  chrome.storage.local.get("cachedFolders", (result) => {
    const folders = result.cachedFolders || [];
    if (folders.length === 0) return;
    const latest = [...folders].sort((a,b) => new Date(b.createdTime)-new Date(a.createdTime))[0];
    if (!latest) return;
    document.getElementById("managerRecentName").textContent = cleanFolderName(latest.name);
    document.getElementById("managerRecentDate").textContent = new Date(latest.createdTime).toLocaleDateString();
    document.getElementById("managerRecentSection").style.display = "block";
    const el = document.getElementById("managerRecentFolder");
    const fresh = el.cloneNode(true);
    el.parentNode.replaceChild(fresh, el);
    fresh.addEventListener("click", () => {
      document.querySelectorAll(".folder-item,.suggested-folder,.manager-recent-card").forEach(i => i.classList.remove("selected"));
      fresh.classList.add("selected");
      selectedFolderId = latest.id; selectedFolderName = latest.name;
      resetFolderState();
      document.getElementById("uploadBtn").disabled = false;
      loadFolderPreview(latest.id);
    });
  });
}

// ── Folder Controls ──
function populateFilterDropdown() {
  chrome.storage.local.get("cachedFolders", (result) => {
    const folders = result.cachedFolders || [];
    const names = [...new Set(folders.map(f => {
      const p = f.name.split("--"); return p.length >= 2 ? p[1].trim() : null;
    }).filter(Boolean))].sort();
    const sel = document.getElementById("filterSalesperson");
    sel.innerHTML = '<option value="">All Salespeople</option>' + names.map(n => `<option value="${n}">${n}</option>`).join("");
  });
}

function fuzzyMatch(folderName, query) {
  if (!query) return true;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const name = folderName.toLowerCase();
  return words.every(w => name.includes(w));
}

function applyFolderControls() {
  const search = document.getElementById("folderSearch").value;
  const filterSP = document.getElementById("filterSalesperson").value.toLowerCase();
  const sort = document.getElementById("sortFolders").value;
  chrome.storage.local.get("cachedFolders", (result) => {
    let folders = filterFolders(result.cachedFolders || []);
    if (search) folders = folders.filter(f => fuzzyMatch(f.name, search));
    if (filterSP) folders = folders.filter(f => f.name.toLowerCase().includes(`-- ${filterSP}`));
    if (sort === "date-asc") folders.sort((a,b) => new Date(a.createdTime)-new Date(b.createdTime));
    else if (sort === "date-desc") folders.sort((a,b) => new Date(b.createdTime)-new Date(a.createdTime));
    else if (sort === "name-asc") folders.sort((a,b) => a.name.localeCompare(b.name));
    else if (sort === "name-desc") folders.sort((a,b) => b.name.localeCompare(a.name));
    renderFolders(folders);
  });
}

// ── Folder loading ──
async function loadFolders() {
  // Show cached instantly
  chrome.storage.local.get("cachedFolders", (result) => {
    if (result.cachedFolders && result.cachedFolders.length > 0) {
      document.getElementById("loading").style.display = "none";
      document.getElementById("signed-in").style.display = "block";
      renderFolders(filterFolders(result.cachedFolders));
      if (userRole === "manager" && document.getElementById("suggestedSection").style.display === "none") {
        renderManagerRecent();
        populateFilterDropdown();
      }
    } else {
      document.getElementById("loading").style.display = "block";
      document.getElementById("signed-in").style.display = "none";
    }
  });

  try {
    let token = await getValidToken();
    if (!token) {
      document.getElementById("loading").style.display = "none";
      document.getElementById("signed-out").style.display = "block";
      return;
    }
    // Proxy fetch with one auth retry. If proxy says token is invalid
    // (which can happen if it expired between proxy validation calls),
    // refresh the token and retry once before giving up.
    let result;
    try {
      result = await proxyFetch("proxyListFolders", { parentId: DRIVE_FOLDER_ID }, token);
    } catch (err) {
      if (err.code === "auth") {
        token = await refreshToken();
        result = await proxyFetch("proxyListFolders", { parentId: DRIVE_FOLDER_ID }, token);
      } else {
        throw err;
      }
    }
    // Alias createdAt -> createdTime so downstream filterFolders/renderFolders
    // (which expect Drives wire shape) keep working unchanged.
    const folders = (result.folders || []).map(f => ({ ...f, createdTime: f.createdAt }));
    chrome.storage.local.set({ cachedFolders: folders });
    document.getElementById("loading").style.display = "none";
    document.getElementById("signed-in").style.display = "block";
    renderFolders(filterFolders(folders));
    if (userRole === "manager" && document.getElementById("suggestedSection").style.display === "none") {
      renderManagerRecent();
      populateFilterDropdown();
    }
  } catch (err) {
    document.getElementById("loading").style.display = "none";
    showStatus("Error loading folders: " + err.message, "error");
  }
}

function filterFolders(folders) {
  if (userRole === "manager") return folders;
  if (!lockedToOwn || !salespersonName) return folders;
  return folders.filter(f => f.name.toLowerCase().includes(`-- ${salespersonName.toLowerCase()}`));
}

function cleanFolderName(name) {
  return name.replace(/\s*--\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\s*$/, "").trim();
}

function getReadinessLabel(name) {
  // Use name patterns to guess readiness (no extra API call needed)
  return null; // Production: skip pills, keep UI clean
}

function renderFolders(folders) {
  const list = document.getElementById("folderList");
  if (folders.length === 0) {
    list.innerHTML = '<p style="color:rgba(255,255,255,0.35);font-size:12px;text-align:center;padding:12px;">No folders found</p>';
    return;
  }
  const managerActions = userRole === "manager";
  list.innerHTML = folders.map(f => `
    <div class="folder-item" data-id="${f.id}" data-name="${f.name}">
      <div class="folder-item-main">
        <div class="folder-name">${cleanFolderName(f.name)}</div>
        <div class="folder-date">${new Date(f.createdTime).toLocaleDateString()}</div>
      </div>
      <div class="folder-item-right">
        ${managerActions ? `<button class="folder-action-trigger" data-id="${f.id}" data-name="${f.name}">•••</button>` : ""}
      </div>
    </div>`).join("");

  list.querySelectorAll(".folder-item").forEach(el => {
    el.addEventListener("click", (e) => {
      if (e.target.classList.contains("folder-action-trigger")) return;
      document.querySelectorAll(".folder-item,.suggested-folder").forEach(i => i.classList.remove("selected"));
      if (selectedFolderId && selectedFolderId !== el.dataset.id) {
        try { chrome.storage.local.remove(`uploaded_${selectedFolderId}`); } catch(e) {}
      }
      selectedFolderId = el.dataset.id; selectedFolderName = el.dataset.name;
      resetFolderState();
      el.classList.add("selected");
      document.getElementById("uploadBtn").disabled = false;
      loadFolderPreview(selectedFolderId);
    });
  });

  if (managerActions) {
    list.querySelectorAll(".folder-action-trigger").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openFolderActions(btn.dataset.id, btn.dataset.name);
      });
    });
  }
}

// ── Deal Jacket Preview (real Drive API) ──
async function loadFolderPreview(folderId) {
  const strip = document.getElementById("previewStrip");
  const scroll = document.getElementById("previewStripScroll");
  const label = document.getElementById("previewStripLabel");
  scroll.innerHTML = '<div style="font-size:10px;color:rgba(255,255,255,0.3);padding:4px">Loading...</div>';
  strip.style.display = "block";

  try {
    const token = await getValidToken();
    if (!token) { strip.style.display = "none"; return; }
    // Proxy returns {files: [{id,name,mimeType,size,modifiedAt}]} — note that
    // the proxy does NOT return thumbnailLink. Without thumbnails we render
    // a generic icon for every file. Acceptable tradeoff for security:
    // sending thumbnailLink would require a fresh token round-trip anyway
    // since thumbnail URLs need auth.
    const result = await proxyFetch("proxyListFiles", { folderId }, token);
    const files = result.files || [];
    if (files.length === 0) { strip.style.display = "none"; return; }

    label.textContent = `${files.length} file${files.length !== 1 ? "s" : ""} in folder`;
    scroll.innerHTML = files.map(f => {
      const icon = f.mimeType === "application/pdf" ? "📄" : f.mimeType?.includes("image") ? "🖼️" : "📎";
      return `<div class="preview-thumb" title="${f.name}">
        <div class="preview-thumb-icon">${icon}</div>
        <div class="preview-thumb-name">${f.name.replace(/\.[^.]+$/,"")}</div>
      </div>`;
    }).join("");
    strip.style.display = "block";
  } catch (e) { strip.style.display = "none"; }
}

function clearFolderPreview() {
  document.getElementById("previewStrip").style.display = "none";
  document.getElementById("previewStripScroll").innerHTML = "";
}

// ── Folder Actions (real Drive API) ──
function openFolderActions(folderId, folderName) {
  currentFolderActionId = folderId;
  currentFolderActionName = folderName;
  document.getElementById("folderActionName").textContent = cleanFolderName(folderName);
  document.getElementById("folderActionMeta").textContent = new Date().toLocaleDateString();
  document.getElementById("faReassignForm").style.display = "none";
  document.getElementById("faReassignName").value = "";
  document.getElementById("folderActionStatus").textContent = "";
  showScreen("folder-actions-screen");
}

async function archiveFolder() {
  const status = document.getElementById("folderActionStatus");
  status.textContent = "Archiving..."; status.style.color = "rgba(255,255,255,0.5)";
  try {
    const token = await getValidToken();
    // Note: this is a rename with "ARCHIVED_" prefix (preserving existing
    // behavior), not a move to the archive folder. proxyArchiveFolder
    // (which moves) is available if we want true archiving later.
    const newName = "ARCHIVED_" + currentFolderActionName;
    await proxyFetch("proxyRenameFolder", { folderId: currentFolderActionId, newName }, token);
    status.textContent = "✓ Folder archived"; status.style.color = "#a8f0bc";
    chrome.storage.local.remove("cachedFolders");
    setTimeout(() => { showScreen(null); loadFolders(); }, 800);
  } catch (e) { status.textContent = "Error: " + e.message; status.style.color = "#ffb3be"; }
}

async function reassignFolder() {
  const newSP = document.getElementById("faReassignName").value.trim();
  if (!newSP) return;
  const status = document.getElementById("folderActionStatus");
  status.textContent = "Reassigning..."; status.style.color = "rgba(255,255,255,0.5)";
  try {
    const token = await getValidToken();
    const parts = currentFolderActionName.split("--");
    if (parts.length >= 2) parts[1] = ` ${newSP} `;
    const newName = parts.join("--").trim();
    await proxyFetch("proxyRenameFolder", { folderId: currentFolderActionId, newName }, token);
    status.textContent = `✓ Reassigned to ${newSP}`; status.style.color = "#a8f0bc";
    chrome.storage.local.remove("cachedFolders");
    setTimeout(() => { showScreen(null); loadFolders(); }, 800);
  } catch (e) { status.textContent = "Error: " + e.message; status.style.color = "#ffb3be"; }
}

async function deleteFolder() {
  const status = document.getElementById("folderActionStatus");
  try {
    const token = await getValidToken();
    // Empty-check via proxy first (safer UX than letting backend trash a
    // non-empty folder by surprise — we want the explicit user confirmation
    // path only if the folder really is empty).
    const checkResult = await proxyFetch("proxyListFiles", { folderId: currentFolderActionId }, token);
    const files = checkResult.files || [];
    if (files.length > 0) {
      status.textContent = "❌ Cannot delete — folder has files"; status.style.color = "#ffb3be"; return;
    }
    // Updated confirm message: backend uses setTrashed so its actually
    // recoverable for 30 days from owners Drive trash — message reflects that.
    if (!confirm(`Delete "${cleanFolderName(currentFolderActionName)}"? It will be moved to trash (recoverable for 30 days).`)) return;
    status.textContent = "Deleting..."; status.style.color = "rgba(255,255,255,0.5)";
    await proxyFetch("proxyDeleteFolder", { folderId: currentFolderActionId }, token);
    status.textContent = "✓ Folder moved to trash"; status.style.color = "#a8f0bc";
    chrome.storage.local.remove("cachedFolders");
    setTimeout(() => { showScreen(null); loadFolders(); }, 800);
  } catch (e) { status.textContent = "Error: " + e.message; status.style.color = "#ffb3be"; }
}

// ── Customer detection ──
function searchFolderByCustomer(customerName) {
  chrome.storage.local.get("cachedFolders", (result) => {
    const folders = filterFolders(result.cachedFolders || []);
    const words = customerName.toLowerCase().split(/\s+/).filter(Boolean);
    const sl = salespersonName.toLowerCase();
    // Try exact salesperson match first (for salespersons)
    let match = null;
    if (userRole !== "manager" && sl) {
      match = folders.find(f => {
        const n = f.name.toLowerCase();
        return words.some(w => n.includes(w)) && n.includes(`-- ${sl}`);
      });
    }
    // Fallback: any word match
    if (!match) match = folders.find(f => words.some(w => f.name.toLowerCase().includes(w)));
    if (match) showSuggestedFolder(customerName, match);
  });
}

function showSuggestedFolder(customerName, folder) {
  document.getElementById("managerRecentSection").style.display = "none";
  document.getElementById("detectedCustomerName").textContent = customerName;
  document.getElementById("suggestedFolderName").textContent = cleanFolderName(folder.name);
  document.getElementById("suggestedFolderDate").textContent = new Date(folder.createdTime).toLocaleDateString();
  document.getElementById("suggestedSection").style.display = "block";
  const el = document.getElementById("suggestedFolder");
  const fresh = el.cloneNode(true);
  el.parentNode.replaceChild(fresh, el);
  fresh.addEventListener("click", () => {
    document.querySelectorAll(".folder-item").forEach(i => i.classList.remove("selected"));
    fresh.classList.add("selected");
    selectedFolderId = folder.id; selectedFolderName = folder.name;
    resetFolderState();
    document.getElementById("uploadBtn").disabled = false;
    loadFolderPreview(folder.id);
  });
}

// ── Onboarding ──
function showOnboarding() {
  document.getElementById("onboarding").style.display = "flex";
  document.getElementById("app-screen").style.display = "none";
  document.getElementById("ob-next-1").addEventListener("click", () => {
    document.getElementById("ob-step-1").style.display = "none";
    document.getElementById("ob-step-2").style.display = "flex";
  });
  document.getElementById("ob-signin-btn").addEventListener("click", async () => {
    const status = document.getElementById("ob-signin-status");
    status.textContent = "Signing in...";
    const token = await getFreshToken(true);
    if (token) {
      await autoDetectName(token);
      status.textContent = "✓ Signed in";
      status.style.color = "#a8f0bc";
      setTimeout(() => {
        document.getElementById("ob-step-2").style.display = "none";
        document.getElementById("ob-step-3").style.display = "flex";
      }, 700);
    } else {
      status.textContent = "Sign in failed. Try again.";
      status.style.color = "#ffb3be";
    }
  });
  document.getElementById("ob-finish-btn").addEventListener("click", () => {
    const name = document.getElementById("ob-name-input").value.trim();
    if (!name) { showStatus("Please enter your first name.", "error"); return; }
    salespersonName = name;
    chrome.storage.local.set({ salespersonName: name, onboardingDone: true });
    document.getElementById("onboarding").style.display = "none";
    document.getElementById("app-screen").style.display = "flex";
    initMain();
  });
}

// ── Upload Screen ──
function showUploadScreen() {
  document.getElementById("app-screen").style.display = "none";
  document.getElementById("upload-screen").style.display = "flex";
  const img = document.getElementById("uploadPreviewImg");
  const ph = document.getElementById("uploadPreviewPlaceholder");
  img.classList.remove("visible"); img.style.display = "none";
  ph.style.display = "flex";
  ph.innerHTML = '<div class="upload-preview-icon">&#8613;</div>';
  document.getElementById("uploadPreviewBox").classList.remove("has-image");
  setUploadProgress(0, 0, 0, "Preparing...");
}

function hideUploadScreen() {
  document.getElementById("upload-screen").style.display = "none";
  document.getElementById("app-screen").style.display = "flex";
}

function showUploadSuccess(folderName, fileCount) {
  document.getElementById("uploadSuccessFolder").textContent = cleanFolderName(folderName);
  document.getElementById("uploadSuccessCount").textContent = `${fileCount} file${fileCount !== 1 ? "s" : ""} sent to Tekion`;
  document.getElementById("app-screen").style.display = "none";
  document.getElementById("upload-success-screen").style.display = "flex";
  setTimeout(() => {
    document.getElementById("upload-success-screen").style.display = "none";
    document.getElementById("app-screen").style.display = "flex";
    window.parent.postMessage({ action: "closeModal" }, "*");
  }, 1800);
}

function setUploadProgress(current, total, percent, fileName) {
  document.getElementById("uploadProgressBar").style.width = percent + "%";
  document.getElementById("uploadCount").textContent = total > 0 ? `${current} of ${total} files` : "";
  document.getElementById("uploadFileName").textContent = fileName;
}

function updatePreview(blob, mimeType) {
  const img = document.getElementById("uploadPreviewImg");
  const ph = document.getElementById("uploadPreviewPlaceholder");
  const box = document.getElementById("uploadPreviewBox");
  if (mimeType && mimeType.startsWith("image/")) {
    const url = URL.createObjectURL(blob);
    img.classList.remove("visible"); img.style.display = "block";
    img.onload = () => { ph.style.display = "none"; box.classList.add("has-image"); img.classList.add("visible"); URL.revokeObjectURL(url); };
    img.src = url;
  } else {
    const ext = mimeType ? mimeType.split("/")[1] : "file";
    ph.innerHTML = `<div style="text-align:center"><div style="font-size:32px">📄</div><div style="font-size:11px;color:rgba(255,255,255,0.4)">${ext}</div></div>`;
    ph.style.display = "flex"; img.style.display = "none";
  }
}

// ── Auth ──
function getFreshToken(interactive = false) {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      resolve((chrome.runtime.lastError || !token) ? null : token);
    });
  });
}

function getValidToken() { return getFreshToken(false); }

async function refreshToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(["dsAccessToken","dsTokenExpiry"]);
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      resolve((chrome.runtime.lastError || !token) ? null : token);
    });
  });
}

async function signIn() {
  const token = await getFreshToken(true);
  if (token) {
    if (!salespersonName) await autoDetectName(token);
    showSignedIn(); loadFolders();
    window.parent.postMessage({ action: "getCustomerName" }, "*");
  } else {
    showStatus("Sign in failed. Try again.", "error");
    logEvent("authFailed", { reason: "getAuthToken returned null" });
  }
}

async function autoDetectName(token) {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const info = await res.json();
    const firstName = info.given_name || info.name?.split(" ")[0] || "";
    if (firstName) {
      salespersonName = firstName;
      chrome.storage.local.set({ salespersonName: firstName });
      const n = document.getElementById("settingName"); if (n) n.value = firstName;
      const o = document.getElementById("ob-name-input"); if (o) o.value = firstName;
    }
  } catch (e) {}
}

function showSignedIn() {
  document.getElementById("signed-out").style.display = "none";
  document.getElementById("signed-in").style.display = "block";
}

// ── Main Init ──
async function initMain() {
  // Load resolved role from storage (set by background.js via config email check)
  await new Promise(resolve => {
    chrome.storage.local.get(["resolvedRole", "userRole", "salespersonName", "lockedToOwn"], (result) => {
      // resolvedRole (from email) takes priority over manually set userRole
      if (result.resolvedRole) {
        userRole = result.resolvedRole === "it" ? "manager" : result.resolvedRole;
        isITUser = result.resolvedRole === "it";
      } else {
        userRole = result.userRole || "salesperson";
        isITUser = false;
      }
      lockedToOwn = result.lockedToOwn || false;
      if (result.salespersonName) salespersonName = result.salespersonName;
      resolve();
    });
  });

  applyManagerUI();
  // v3.9: render banner from current config
  chrome.storage.local.get(["dsConfig"], (r) => applyBanner(r.dsConfig));
  // v3.9: live-update banner when DealerScan Dash changes the message
  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.dsConfig) applyBanner(changes.dsConfig.newValue);
    });
  } catch (e) {}
  const token = await getFreshToken(false);
  if (token) {
    if (!salespersonName) await autoDetectName(token);
    showSignedIn(); loadFolders();
    window.parent.postMessage({ action: "getCustomerName" }, "*");
    registerUser(token);
  } else {
    document.getElementById("signed-out").style.display = "block";
  }
  document.getElementById("signInBtn").addEventListener("click", signIn);
  document.getElementById("uploadBtn").addEventListener("click", uploadToDrive);
  document.getElementById("refreshBtn").addEventListener("click", () => {
    selectedFolderId = null; extraFiles = []; renderExtraFiles();
    document.getElementById("uploadBtn").disabled = true;
    document.getElementById("suggestedSection").style.display = "none";
    clearFolderPreview();
    loadFolders();
    window.parent.postMessage({ action: "getCustomerName" }, "*");
  });
  initDropZone();
}

// ── User Registration ──
async function registerUser(token) {
  try {
    if (!salespersonName) return;
    let email = await new Promise(resolve => chrome.storage.local.get("userEmail", r => resolve(r.userEmail || null)));
    if (!email) {
      // userinfo IS a Google OAuth endpoint, not Drive — stays direct.
      const res = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", { headers: { Authorization: `Bearer ${token}` } });
      const info = await res.json();
      email = info.email || null;
      if (email) chrome.storage.local.set({ userEmail: email });
    }
    if (!email) return;

    // Read existing users (proxy), mutate locally, write back (proxy).
    // Two calls but no race window because each session writes a different
    // email key in the users object; concurrent registrations from different
    // sessions just merge naturally (last-write-wins per email).
    const USERS_FILE = "_DealerScan_Users.json";
    let users = {};
    try {
      const readResult = await proxyFetch("proxyReadJsonFile", { fileName: USERS_FILE }, token);
      users = readResult.parsed || {};
    } catch (err) {
      if (!String(err.message).includes("file_not_found")) throw err;
      // First-run: file doesnt exist, start with empty object
    }

    users[email] = { name: salespersonName, email, role: isITUser ? "it" : userRole, lastSeen: new Date().toISOString() };

    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set("action", "proxyWriteJsonFile");
    url.searchParams.set("accessToken", token);
    url.searchParams.set("fileName", USERS_FILE);
    const body = new FormData();
    body.append("content", JSON.stringify(users));
    await fetch(url.toString(), { method: "POST", body });
  } catch(e) {}
}

// ── Upload to Tekion ──
async function uploadToDrive() {
  if (!selectedFolderId) return;
  // v3.9: prevent double-click race — disable immediately, async work below could otherwise fire twice
  const btn = document.getElementById("uploadBtn");
  if (btn.disabled) return;
  btn.disabled = true;
  let token = await getValidToken();
  if (!token) { showStatus("Not authenticated", "error"); btn.disabled = false; return; }

  const checkResult = await proxyFetch("proxyListFiles", { folderId: selectedFolderId }, token);
  const allDriveFileIds = (checkResult.files || []).map(f => f.id);
  const uploadedKey = `uploaded_${selectedFolderId}`;
  const storedUploaded = await new Promise(resolve => chrome.storage.local.get(uploadedKey, r => resolve(r[uploadedKey] || [])));
  let newDriveFileIds = allDriveFileIds.filter(id => !storedUploaded.includes(id));

  // v3.9: 2-press re-upload confirmation override
  const isReupload = newDriveFileIds.length === 0 && extraFiles.length === 0 && allDriveFileIds.length > 0;
  if (isReupload) {
    if (!pendingReuploadConfirm) {
      pendingReuploadConfirm = true;
      showStatus("⚠️ These files were already uploaded. Press Upload again to re-send.", "warning", 5500);
      // v3.9: button visual cue during 5s confirm window
      btn.classList.add("confirm-pending");
      btn.textContent = "⚠️ Upload Anyway";
      clearTimeout(pendingReuploadTimer);
      pendingReuploadTimer = setTimeout(() => {
        pendingReuploadConfirm = false;
        clearReuploadVisual();
      }, 5000);
      btn.disabled = false; // v3.9: must re-enable so user can press again to confirm
      return;
    }
    // 2nd press within window: confirmed, override and re-upload everything
    pendingReuploadConfirm = false;
    clearTimeout(pendingReuploadTimer);
    newDriveFileIds = [...allDriveFileIds];
    logEvent("reuploadOverride", { customer: currentCustomerName, folderName: selectedFolderName, fileCount: allDriveFileIds.length });
  }

  if (newDriveFileIds.length === 0 && extraFiles.length === 0) {
    showStatus("No new files to upload.", "error"); btn.disabled = false; return;
  }

  showUploadScreen();
  try {
    const fileObjects = [];
    const nameCounts = {};

    // Reuse the file list already fetched above (checkResult) instead of a
    // second proxyListFiles round-trip.
    const newDriveFiles = (checkResult.files || []).filter(f => newDriveFileIds.includes(f.id));

    // Pre-compute dedup names synchronously, in the original order (drive
    // files first, then extras) so naming stays deterministic even though
    // the I/O below now runs in parallel.
    const driveNames = newDriveFiles.map(f => deduplicateName(f.name, nameCounts));
    const extraNames = extraFiles.map(f => deduplicateName(f.name, nameCounts));

    const total = newDriveFiles.length + extraFiles.length;
    let done = 0;
    const bumpProgress = (label) => {
      done++;
      setUploadProgress(done, total, Math.round((done / total) * 65), label);
    };

    // Parallel: pull each Drive file's bytes via proxy. This was a sequential
    // await-in-loop — the main upload bottleneck. Order preserved via map index.
    const drivePromises = newDriveFiles.map((f, i) =>
      proxyFetch("proxyReadFile", { fileId: f.id }, token).then(readResult => {
        const binaryStr = atob(readResult.base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let b = 0; b < binaryStr.length; b++) bytes[b] = binaryStr.charCodeAt(b);
        const blob = new Blob([bytes], { type: f.mimeType || "image/jpeg" });
        updatePreview(blob, f.mimeType);
        bumpProgress(f.name);
        return new File([blob], driveNames[i], { type: f.mimeType || "image/jpeg" });
      })
    );

    // Parallel: upload each extra (dropped) file to Drive. The Drive copy gets
    // the dedup name; the object injected into Tekion keeps the original name
    // (matches prior behavior exactly).
    const extraPromises = extraFiles.map((f, i) =>
      uploadFileToDrive(f, extraNames[i], selectedFolderId, token).then(() => {
        updatePreview(f, f.type);
        bumpProgress(f.name);
        return new File([f], f.name, { type: f.type });
      })
    );

    const [driveResults, extraResults] = await Promise.all([
      Promise.all(drivePromises),
      Promise.all(extraPromises)
    ]);
    fileObjects.push(...driveResults, ...extraResults);

    setUploadProgress(fileObjects.length, fileObjects.length, 80, "Sending to Tekion...");
    const fileDataArray = await Promise.all(fileObjects.map(f => new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res({ name: f.name, type: f.type, data: reader.result });
      reader.onerror = () => rej(new Error("Read failed"));
      reader.readAsDataURL(f);
    })));

    selectedFileCount = fileObjects.length;
    // v3.9: stash uploaded IDs — committed by injectSuccess handler. Dedupe in case of re-upload override.
    pendingUploadedFileIds = { key: uploadedKey, ids: [...new Set([...storedUploaded, ...newDriveFileIds])] };
    window.parent.postMessage({ action: "injectFiles", files: fileDataArray }, "*");
  } catch (err) {
    hideUploadScreen();
    showStatus(friendlyError(err.message), "error");
    logEvent("uploadFailed", { folderName: selectedFolderName, customer: currentCustomerName, error: err.message });
    document.getElementById("uploadBtn").disabled = false;
  }
}

function deduplicateName(fileName, nameCounts) {
  if (nameCounts[fileName] !== undefined) {
    nameCounts[fileName]++;
    const dot = fileName.lastIndexOf(".");
    return dot > -1 ? `${fileName.slice(0,dot)}_${nameCounts[fileName]}${fileName.slice(dot)}` : `${fileName}_${nameCounts[fileName]}`;
  }
  nameCounts[fileName] = 0;
  return fileName;
}

async function uploadFileToDrive(file, fileName, folderId, token) {
  // Convert File/Blob to base64 then POST via proxyUploadFile.
  // Using POST (not GET) because base64 payloads of multi-MB images
  // would exceed URL length limits.
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // FileReader gives us "data:mime;base64,XXXX" — strip the prefix
      const result = reader.result;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const mimeType = file.type || "application/octet-stream";
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set("action", "proxyUploadFile");
  url.searchParams.set("accessToken", token);
  url.searchParams.set("folderId", folderId);
  url.searchParams.set("fileName", fileName);
  url.searchParams.set("mimeType", mimeType);
  const body = new FormData();
  body.append("base64", base64);
  const res = await fetch(url.toString(), { method: "POST", body });
  const data = await res.json();
  if (!data.ok) throw new Error(`upload failed: ${data.error || "unknown"}`);
  return data;
}

// ── Drive Log ──
async function writeLogEntry() {
  try {
    const token = await getValidToken();
    if (!token) return;
    // Atomic append via proxy — eliminates the read-modify-write race
    // between concurrent uploads from different sessions.
    const entry = {
      id: Date.now().toString(36), timestamp: new Date().toISOString(),
      salesperson: salespersonName, customer: currentCustomerName,
      folderName: selectedFolderName, folderId: selectedFolderId
    };
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set("action", "proxyAppendJsonEntry");
    url.searchParams.set("accessToken", token);
    url.searchParams.set("fileName", LOG_FILE_NAME);
    url.searchParams.set("arrayKey", "entries");
    url.searchParams.set("maxLength", "200");
    const body = new FormData();
    body.append("entry", JSON.stringify(entry));
    await fetch(url.toString(), { method: "POST", body });
  } catch (e) {}
}

// ── Sales Data ──
async function loadSalesData() {
  const body = document.getElementById("salesDataBody");
  body.innerHTML = '<div class="status loading" style="margin:12px">Loading...</div>';
  try {
    const token = await getValidToken();
    if (!token) { body.innerHTML = '<div class="status error" style="margin:12px">Not authenticated</div>'; return; }
    const today = new Date().toDateString();
    // Parallel fetches via proxy:
    //   - Sales log (system JSON file)
    //   - Customer folders list (used to compute "no docs yet")
    const [logResult, foldersResult] = await Promise.all([
      proxyFetch("proxyReadJsonFile", { fileName: LOG_FILE_NAME }, token).catch(err => {
        // If log file doesn't exist yet, treat as empty — proxy returns
        // file_not_found which we swallow here so first-run users
        // dont see an error.
        if (String(err.message).includes("file_not_found")) return { parsed: { entries: [] } };
        throw err;
      }),
      proxyFetch("proxyListFolders", { parentId: DRIVE_FOLDER_ID }, token),
    ]);
    const entries = (logResult.parsed && logResult.parsed.entries) || [];
    // Alias createdAt -> createdTime so the render fn keeps working
    const allFolders = (foldersResult.folders || []).map(f => ({ ...f, createdTime: f.createdAt }));
    const todayCount = entries.filter(e => new Date(e.timestamp).toDateString() === today).length;
    document.getElementById("salesDataTodayCount").textContent = `${todayCount} today`;
    renderSalesData(entries, allFolders);
  } catch (e) { document.getElementById("salesDataBody").innerHTML = `<div class="status error" style="margin:12px">Error: ${e.message}</div>`; }
}

function renderSalesData(entries, allFolders) {
  const body = document.getElementById("salesDataBody");
  const today = new Date().toDateString();
  const counts = {}, todayCounts = {};
  entries.forEach(e => {
    const sp = e.salesperson || "Unknown";
    counts[sp] = (counts[sp]||0)+1;
    if (new Date(e.timestamp).toDateString()===today) todayCounts[sp] = (todayCounts[sp]||0)+1;
  });
  const uploadedIds = new Set(entries.map(e => e.folderId));
  const zeroDocs = allFolders.filter(f => !uploadedIds.has(f.id));
  const recent = [...entries].reverse().slice(0,15);
  const todayEntries = entries.filter(e => new Date(e.timestamp).toDateString()===today).reverse();

  const logRow = (e) => `<div class="sd-log-row">
    <div class="sd-log-info"><div class="sd-log-customer">${e.customer||cleanFolderName(e.folderName||"")}</div><div class="sd-log-sp">${e.salesperson}</div></div>
    <div class="sd-log-time">${new Date(e.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
  </div>`;

  const section = (id, title, content, defaultOpen=true) => `
    <div class="sd-section">
      <div class="sd-section-title sd-collapsible" data-target="${id}">
        ${title}<span class="sd-chevron ${defaultOpen?"open":""}">▾</span>
      </div>
      <div class="sd-section-body" id="${id}" style="display:${defaultOpen?"block":"none"}">${content}</div>
    </div>`;

  body.innerHTML =
    section("sd-counts", "📊 Upload Counts", Object.keys(counts).length===0
      ? '<div class="sd-empty">No uploads logged yet</div>'
      : Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([sp,total])=>`
          <div class="sd-stat-row"><div class="sd-stat-name">${sp}</div>
          <div class="sd-stat-nums"><span class="sd-today">${todayCounts[sp]||0} today</span><span class="sd-total">${total} total</span></div></div>`).join(""), false) +

    section("sd-nodocs", "🔴 No Uploads Yet", zeroDocs.length===0
      ? '<div class="sd-empty">All folders uploaded ✓</div>'
      : zeroDocs.slice(0,20).map(f=>`<div class="sd-folder-row"><div class="sd-folder-name">${cleanFolderName(f.name)}</div><div class="sd-folder-date">${new Date(f.createdTime).toLocaleDateString()}</div></div>`).join(""), true) +

    section("sd-today", "📡 Live Feed — Today", todayEntries.length===0
      ? '<div class="sd-empty">No uploads today yet</div>'
      : todayEntries.map(logRow).join(""), true) +

    section("sd-recent", "📋 Recent Uploads", recent.length===0
      ? '<div class="sd-empty">No upload history</div>'
      : recent.map(logRow).join(""), false);

  body.querySelectorAll(".sd-collapsible").forEach(title => {
    title.addEventListener("click", () => {
      const target = document.getElementById(title.dataset.target);
      const chevron = title.querySelector(".sd-chevron");
      const isOpen = target.style.display !== "none";
      target.style.display = isOpen ? "none" : "block";
      chevron.classList.toggle("open", !isOpen);
    });
  });
}

// ── Events Data (IT Panel) ──
async function loadEventsData() {
  const body = document.getElementById("eventLogBody");
  body.innerHTML = '<div class="status loading" style="margin:12px">Loading events...</div>';
  try {
    const token = await getValidToken();
    if (!token) { body.innerHTML = '<div class="status error" style="margin:12px">Not authenticated</div>'; return; }
    // Single proxy call replaces the previous search+read pattern.
    // Swallow file_not_found so first-run users see the empty state
    // instead of an error.
    let events = [];
    try {
      const result = await proxyFetch("proxyReadJsonFile", { fileName: "_DealerScan_Events.json" }, token);
      events = (result.parsed && result.parsed.events) || [];
    } catch (err) {
      if (!String(err.message).includes("file_not_found")) throw err;
    }
    if (events.length === 0) {
      body.innerHTML = '<div class="sd-section"><div class="sd-section-title">📋 Event Log</div><div class="sd-empty">No events logged yet</div></div>'; return;
    }
    const typeConfig = {
      uploadSuccess:{icon:"✅",label:"Upload Success"}, uploadFailed:{icon:"❌",label:"Upload Failed"},
      injectFailed:{icon:"⚠️",label:"Inject Failed"}, authFailed:{icon:"🔐",label:"Auth Failed"},
      emptyFolder:{icon:"📂",label:"Empty Folder"}, sessionStart:{icon:"👁",label:"Session Open"},
    };
    const summary = {};
    events.forEach(e => { summary[e.type]=(summary[e.type]||0)+1; });
    const errors = events.filter(e => ["uploadFailed","injectFailed","authFailed"].includes(e.type)).reverse().slice(0,15);
    body.innerHTML = `
      <div class="sd-section">
        <div class="sd-section-title">📊 Summary</div>
        ${Object.entries(summary).sort((a,b)=>b[1]-a[1]).map(([type,count])=>{
          const c=typeConfig[type]||{icon:"•",label:type};
          return `<div class="sd-stat-row"><div class="sd-stat-name">${c.icon} ${c.label}</div><div class="sd-stat-nums"><span class="sd-total">${count}</span></div></div>`;
        }).join("")}
      </div>
      <div class="sd-section">
        <div class="sd-section-title">🚨 Errors</div>
        ${errors.length===0?'<div class="sd-empty">No errors ✓</div>':errors.map(e=>{
          const c=typeConfig[e.type]||{icon:"•",label:e.type};
          return `<div class="sd-log-row"><div class="sd-log-info"><div class="sd-log-customer">${c.icon} ${c.label} — ${e.salesperson||"?"}</div><div class="sd-log-sp">${e.error||""}</div></div><div class="sd-log-time">${new Date(e.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div></div>`;
        }).join("")}
      </div>
      <div class="sd-section">
        <div class="sd-section-title">📋 Recent Events</div>
        ${[...events].reverse().slice(0,30).map(e=>{
          const c=typeConfig[e.type]||{icon:"•",label:e.type};
          return `<div class="sd-log-row"><div class="sd-log-info"><div class="sd-log-customer">${c.icon} ${c.label}</div><div class="sd-log-sp">${e.salesperson||"?"} · ${new Date(e.timestamp).toLocaleDateString()}</div></div><div class="sd-log-time">${new Date(e.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div></div>`;
        }).join("")}
      </div>`;
  } catch (e) { body.innerHTML = `<div class="status error" style="margin:12px">Error: ${e.message}</div>`; }
}

// ── Create Folder ──
async function populateCfDropdowns() {
  chrome.storage.local.get(["cachedFolders", "dsConfig"], (result) => {
    const folders = result.cachedFolders || [];
    const config = result.dsConfig || {};

    // Salesperson dropdown — from folder names
    const spNames = [...new Set(folders.map(f => {
      const p = f.name.split("--"); return p.length >= 2 ? p[1].trim() : null;
    }).filter(Boolean))].sort();

    // Manager dropdown — from config.managers emails, extract name portion
    // Falls back to IT user name if no managers set
    const managerNames = [];
    if (config.managers && config.managers.length > 0) {
      config.managers.forEach(email => {
        // Use part before @ as display name, capitalized
        const name = email.split("@")[0].replace(/[._-]/g," ").replace(/\b\w/g, c => c.toUpperCase());
        managerNames.push(name);
      });
    }
    // Also check registered users file for manager role
    if (managerNames.length === 0) managerNames.push("Manager");

    const mgr = document.getElementById("cf-manager");
    const sp = document.getElementById("cf-salesperson-select");

    mgr.innerHTML = '<option value="">Select manager...</option>' +
      managerNames.map(n => `<option value="${n}">${n}</option>`).join("");

    sp.innerHTML = '<option value="">Select salesperson...</option>' +
      spNames.map(n => `<option value="${n}">${n}</option>`).join("");

    document.getElementById("cf-customer").value = "";
    document.getElementById("cfPreviewText").textContent = "—";
    document.getElementById("createFolderStatus").textContent = "";
    document.getElementById("cfDuplicateWarn").style.display = "none";
  });
}

function checkDuplicateFolder() {
  const warn = document.getElementById("cfDuplicateWarn");
  const input = document.getElementById("cf-customer").value.trim();
  if (!input) { warn.style.display = "none"; return; }
  const words = input.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) { warn.style.display = "none"; return; }
  const today = new Date().toDateString();
  chrome.storage.local.get("cachedFolders", (result) => {
    const folders = result.cachedFolders || [];
    const matches = folders.filter(f => words.some(w => f.name.toLowerCase().includes(w)));
    if (matches.length === 0) { warn.style.display = "none"; return; }
    const todayMatches = matches.filter(f => new Date(f.createdTime).toDateString() === today);
    const shown = todayMatches.length > 0 ? todayMatches : matches.slice(0,2);
    const isToday = todayMatches.length > 0;
    warn.style.display = "block";
    warn.innerHTML = `
      <div class="cf-dup-title">⚠️ ${isToday?"Folder exists today":"Similar folder found"}</div>
      ${shown.map(f => {
        const parts = f.name.split("--");
        const spName = parts.length >= 2 ? parts[1].trim() : "?";
        return `<div class="cf-dup-row"><div class="cf-dup-name">${cleanFolderName(f.name)}</div><div class="cf-dup-meta">${spName} · ${new Date(f.createdTime).toLocaleDateString()}</div></div>`;
      }).join("")}
      <div class="cf-dup-hint">You can still create a new folder if this is a different customer.</div>`;
  });
}

function updateFolderPreview() {
  const customer = document.getElementById("cf-customer").value.trim();
  const sp = document.getElementById("cf-salesperson-select").value;
  const date = new Date().toLocaleDateString("en-US", { month:"numeric", day:"numeric", year:"numeric" });
  document.getElementById("cfPreviewText").textContent = (customer && sp) ? `${customer} -- ${sp} -- ${date}` : "—";
}

async function createCustomerFolder() {
  const customer = document.getElementById("cf-customer").value.trim();
  const sp = document.getElementById("cf-salesperson-select").value;
  const mgr = document.getElementById("cf-manager").value;
  const status = document.getElementById("createFolderStatus");
  if (!customer) { status.textContent = "Please enter a customer name."; status.style.color = "#ffb3be"; return; }
  if (!sp) { status.textContent = "Please select a salesperson."; status.style.color = "#ffb3be"; return; }
  const date = new Date().toLocaleDateString("en-US", { month:"numeric", day:"numeric", year:"numeric" });
  const folderName = `${customer} -- ${sp} -- ${date}`;
  status.textContent = "Creating folder..."; status.style.color = "rgba(255,255,255,0.5)";
  document.getElementById("createFolderBtn").disabled = true;
  try {
    const token = await getValidToken();
    if (!token) throw new Error("Not authenticated");
    // proxyCreateFolder dedupes — if a folder with the same name exists,
    // returns that one. Returns { ok, folderId, name, createdAt, existed }.
    const createResult = await proxyFetch("proxyCreateFolder", { name: folderName }, token);
    // Match the shape downstream code expects (folder.id)
    const folder = { id: createResult.folderId, name: createResult.name };
    for (let i = 0; i < cfFiles.length; i++) {
      status.textContent = `Uploading ${i+1}/${cfFiles.length}: ${cfFiles[i].name}`;
      await uploadFileToDrive(cfFiles[i], cfFiles[i].name, folder.id, token);
    }
    cfFiles = []; renderCfFiles();
    chrome.storage.local.remove("cachedFolders");
    loadFolders();
    document.getElementById("createFolderBtn").disabled = false;
    showCreateSuccess(folderName, sp, mgr);
  } catch (e) {
    status.textContent = "Error: " + e.message; status.style.color = "#ffb3be";
    document.getElementById("createFolderBtn").disabled = false;
  }
}

function showCreateSuccess(folderName, sp, mgr) {
  document.getElementById("cfSuccessName").textContent = cleanFolderName(folderName);
  document.getElementById("cfSuccessSub").textContent = `Assigned to ${sp}${mgr ? " · Manager: "+mgr : ""}`;
  document.getElementById("app-screen").style.display = "none";
  document.getElementById("create-folder-screen").style.display = "none";
  document.getElementById("create-success-screen").style.display = "flex";
  setTimeout(() => {
    document.getElementById("create-success-screen").style.display = "none";
    document.getElementById("app-screen").style.display = "flex";
  }, 1800);
}

function addCfFiles(files) {
  files.forEach(f => { if (!cfFiles.find(e => e.name===f.name&&e.size===f.size)) cfFiles.push(f); });
  renderCfFiles();
}
function renderCfFiles() {
  const wrap = document.getElementById("cfFilesWrap");
  document.getElementById("cfFileCount").textContent = cfFiles.length > 0 ? `(${cfFiles.length})` : "";
  if (cfFiles.length === 0) { wrap.style.display = "none"; return; }
  wrap.style.display = "block";
  wrap.innerHTML = cfFiles.map((f,i) => `<div class="extra-file-item"><div class="extra-file-name">${f.name}</div><button class="extra-file-remove" data-index="${i}">×</button></div>`).join("");
  wrap.querySelectorAll(".extra-file-remove").forEach(btn => btn.addEventListener("click", () => { cfFiles.splice(parseInt(btn.dataset.index),1); renderCfFiles(); }));
}

// ── Drop Zone ──
function initDropZone() {
  const zone = document.getElementById("dropZone");
  const input = document.getElementById("filePickerInput");
  zone.addEventListener("click", () => input.click());
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag-over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
  zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("drag-over"); addExtraFiles(Array.from(e.dataTransfer.files)); });
  input.addEventListener("change", () => { addExtraFiles(Array.from(input.files)); input.value = ""; });
}

function addExtraFiles(files) {
  files.forEach(f => { if (!extraFiles.find(e => e.name===f.name&&e.size===f.size)) extraFiles.push(f); });
  renderExtraFiles();
  if (selectedFolderId) document.getElementById("uploadBtn").disabled = false;
}

function removeExtraFile(index) { extraFiles.splice(index, 1); renderExtraFiles(); }

function renderExtraFiles() {
  const list = document.getElementById("extraFilesList");
  const wrap = document.getElementById("extraFilesWrap");
  if (extraFiles.length === 0) { list.style.display = "none"; return; }
  list.style.display = "block";
  document.getElementById("extraFilesCount").textContent = `(${extraFiles.length})`;
  wrap.innerHTML = extraFiles.map((f,i) => `<div class="extra-file-item"><div class="extra-file-name">${f.name}</div><button class="extra-file-remove" data-index="${i}">×</button></div>`).join("");
  wrap.querySelectorAll(".extra-file-remove").forEach(btn => btn.addEventListener("click", () => removeExtraFile(parseInt(btn.dataset.index))));
}

function showStatus(message, type, duration = 4000) {
  const el = document.getElementById("statusMsg");
  el.className = `status ${type}`; el.textContent = message; el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, duration);
}
