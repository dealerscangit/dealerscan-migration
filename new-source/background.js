const DRIVE_FOLDER_ID  = "1YOL2kFo4PG5UCDcjGH5Z62ak5mN4Jtuk";
const SYSTEM_FOLDER_ID = "1Zb8LUDFD_MA5yD_T3d34kBgCigJj6a7B";
const CONFIG_FILE_NAME = "_DealerScan_Config.json";
const LOG_FILE_NAME    = "_DealerScan_Log.json";
const EVENTS_FILE_NAME = "_DealerScan_Events.json";


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
// are NOT yet routed through the proxy — they still use direct Drive
// API. Will be moved in a follow-up commit once write proxy endpoints
// exist on the backend.
// ─────────────────────────────────────────────────────────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzF13p-WRJloMRBoWiQ4h6EmR7iylkVoGxX0Y9PBpEN0RacIvfxoN_Hd15NJUSYpsQJug/exec";

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

// ── Lifecycle ──
chrome.runtime.onInstalled.addListener(() => { refreshFolderCache(); initSeenFolders(); pollConfig(); });
chrome.runtime.onStartup.addListener(() => { refreshFolderCache(); initSeenFolders(); pollConfig(); });

// ── Message handling ──
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "pollNow") { pollForNewFolders().then(() => sendResponse({ done: true })); return true; }
  if (request.action === "pollConfig") { pollConfig().then(() => sendResponse({ done: true })); return true; }
  if (request.action === "writeConfig") { writeConfig(request.config).then(() => sendResponse({ done: true })); return true; }
  if (request.action === "getConfig") { getStorage(["dsConfig"]).then(r => sendResponse({ config: r.dsConfig || null })); return true; }
  if (request.action === "writeEvent") { writeEventLog(request.event).then(() => sendResponse({ done: true })); return true; }
});

// ── Alarms ──
chrome.alarms.create("refreshFolders", { periodInMinutes: 5 });
chrome.alarms.create("pollFolders",    { periodInMinutes: 0.5 });
chrome.alarms.create("pollConfig",     { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refreshFolders") refreshFolderCache();
  if (alarm.name === "pollFolders")    pollForNewFolders();
  if (alarm.name === "pollConfig")     pollConfig();
});

// ── Config (stored in DRIVE_FOLDER_ID so all accounts can read it) ──
async function pollConfig() {
  try {
    const token = await getToken();
    if (!token) return;
    // Single proxy call replaces the previous search + read pattern.
    // Backend proxyReadJsonFile is scoped to the system folder so we
    // only pass fileName.
    const result = await proxyFetch("proxyReadJsonFile", { fileName: CONFIG_FILE_NAME }, token);
    const config = result.parsed;
    const modifiedAt = result.modifiedAt;
    const stored = await getStorage(["dsConfigModified"]);
    if (stored.dsConfigModified === modifiedAt) return;

    // Resolve role from Google email against config lists
    let userEmail = null;
    try {
      const info = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", { headers: { Authorization: `Bearer ${token}` } });
      const infoData = await info.json();
      userEmail = infoData.email || null;
    } catch(e) {}

    if (userEmail) {
      const managers = (config.managers || []).map(e => e.toLowerCase());
      const itUsers  = (config.itUsers  || []).map(e => e.toLowerCase());
      const email    = userEmail.toLowerCase();
      let resolvedRole = "salesperson";
      if (managers.includes(email)) resolvedRole = "manager";
      if (itUsers.includes(email))  resolvedRole = "it";
      chrome.storage.local.set({ userEmail, resolvedRole });
    }

    chrome.storage.local.set({ dsConfig: config, dsConfigModified: modifiedAt });
    chrome.tabs.query({ url: "https://app.tekioncloud.com/*" }, (tabs) => {
      tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { action: "configUpdated", config }).catch(() => {}));
    });
  } catch (e) {}
}

async function writeConfig(config) {
  try {
    const token = await getToken();
    if (!token) return;
    const search = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${SYSTEM_FOLDER_ID}'+in+parents+and+name='${CONFIG_FILE_NAME}'+and+trashed=false&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await search.json();
    const blob = new Blob([JSON.stringify(config)], { type: "application/json" });
    if (data.files && data.files.length > 0) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${data.files[0].id}?uploadType=media`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: blob
      });
    } else {
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify({ name: CONFIG_FILE_NAME, parents: [SYSTEM_FOLDER_ID] })], { type: "application/json" }));
      form.append("file", blob);
      await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form
      });
    }
    chrome.storage.local.set({ dsConfig: config, dsConfigFileId: null, dsConfigModified: null });
    chrome.tabs.query({ url: "https://app.tekioncloud.com/*" }, (tabs) => {
      tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { action: "configUpdated", config }).catch(() => {}));
    });
  } catch (e) {}
}

async function writeEventLog(event) {
  try {
    const token = await getToken();
    if (!token) return;
    const search = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${SYSTEM_FOLDER_ID}'+in+parents+and+name='${EVENTS_FILE_NAME}'+and+trashed=false&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const searchData = await search.json();
    let log = { events: [] };
    let fileId = null;
    if (searchData.files && searchData.files.length > 0) {
      fileId = searchData.files[0].id;
      try {
        const content = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
        log = await content.json();
      } catch (e) { log = { events: [] }; }
    }
    log.events = log.events || [];
    log.events.push({ ...event, id: Date.now().toString(36), timestamp: new Date().toISOString() });
    if (log.events.length > 500) log.events = log.events.slice(-500);
    const blob = new Blob([JSON.stringify(log)], { type: "application/json" });
    if (fileId) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: blob
      });
    } else {
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify({ name: EVENTS_FILE_NAME, parents: [SYSTEM_FOLDER_ID] })], { type: "application/json" }));
      form.append("file", blob);
      await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form
      });
    }
  } catch (e) {}
}

// ── Seen folders init ──
async function initSeenFolders() {
  const { seenFolderIds } = await getStorage(["seenFolderIds"]);
  if (seenFolderIds) return;
  const token = await getToken();
  if (!token) return;
  try {
    const result = await proxyFetch("proxyListFolders", { parentId: DRIVE_FOLDER_ID }, token);
    chrome.storage.local.set({ seenFolderIds: (result.folders || []).map(f => f.id) });
  } catch (e) {}
}

// ── Poll new folders ──
async function pollForNewFolders() {
  try {
    const { userRole, seenFolderIds } = await getStorage(["userRole", "seenFolderIds"]);
    if (userRole !== "manager") return;
    const token = await getToken();
    if (!token) return;
    const listResult = await proxyFetch("proxyListFolders", { parentId: DRIVE_FOLDER_ID }, token);
    // Proxy returns {id,name,createdAt,modifiedAt}. Downstream code expects
    // createdTime (Drives wire name) — alias it for compatibility.
    const allFolders = (listResult.folders || []).map(f => ({ ...f, createdTime: f.createdAt }));
    const seenIds = seenFolderIds || [];
    const newFolders = allFolders.filter(f => !seenIds.includes(f.id));
    chrome.storage.local.set({ cachedFolders: allFolders });
    if (newFolders.length === 0) return;
    let notifyCount = 0;
    const nowSeen = [];
    for (const folder of newFolders) {
      // Check if folder has any files — used to decide whether to notify
      const filesResult = await proxyFetch("proxyListFiles", { folderId: folder.id }, token);
      if (filesResult.files && filesResult.files.length > 0) { notifyCount++; nowSeen.push(folder.id); }
    }
    if (nowSeen.length > 0) chrome.storage.local.set({ seenFolderIds: [...seenIds, ...nowSeen] });
    if (notifyCount > 0) {
      const { unseenCount } = await getStorage(["unseenCount"]);
      chrome.storage.local.set({ unseenCount: (unseenCount || 0) + notifyCount, notificationTimestamp: Date.now() });
    }
  } catch (e) {}
}

// ── Refresh folder cache ──
async function refreshFolderCache() {
  try {
    const token = await getToken();
    if (!token) return;
    const result = await proxyFetch("proxyListFolders", { parentId: DRIVE_FOLDER_ID }, token);
    // Alias createdAt -> createdTime for downstream compatibility
    const folders = (result.folders || []).map(f => ({ ...f, createdTime: f.createdAt }));
    chrome.storage.local.set({ cachedFolders: folders });
  } catch (e) {}
}

// ── Helpers ──
function getToken() {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      resolve((chrome.runtime.lastError || !token) ? null : token);
    });
  });
}

function getStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}
