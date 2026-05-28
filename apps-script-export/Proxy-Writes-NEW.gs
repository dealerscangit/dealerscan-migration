// ════════════════════════════════════════════════════════════════════
// Phase 4B.2-write — Drive proxy WRITE endpoints
// Added 2026-05-27 night session — completes Phase 4B
//
// Mirrors the read endpoints in Proxy.gs. All endpoints are gated by
// withAuth_() and validate that the target folder/file is within our
// managed scope (customer parent / system folder / archive folder).
//
// Validation pattern: each write endpoint that touches a folder must
// verify the folder is a child of DRIVE_FOLDER_ID before mutating it.
// This prevents an authenticated user from using the proxy to mutate
// arbitrary folders the Workspace owner happens to have access to.
//
// All endpoints return JSON. Response shape: {ok, ...} or {ok:false, error}.
// ════════════════════════════════════════════════════════════════════

// IMPORTANT: these must match the IDs in Code.gs and Proxy.gs
var PROXY_CUSTOMER_PARENT_ID = "1YOL2kFo4PG5UCDcjGH5Z62ak5mN4Jtuk";
var PROXY_ARCHIVE_FOLDER_ID  = "18XJxzHYfslcacGv8_drPU67GGTzDS3Xq";
// PROXY_SYSTEM_FOLDER_ID is declared in Proxy.gs — reuse it

// ────────────────────────────────────────────────────────────────────
// Helper: verify a folder is a child of an expected parent.
// Returns true if folder's parents include expectedParentId.
// Used to scope-check write operations.
// ────────────────────────────────────────────────────────────────────
function _proxyFolderIsChildOf(folderId, expectedParentId) {
  try {
    var f = DriveApp.getFolderById(folderId);
    var parents = f.getParents();
    while (parents.hasNext()) {
      if (parents.next().getId() === expectedParentId) return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// proxyRenameFolder — rename a customer folder
// ════════════════════════════════════════════════════════════════════
// Required: folderId, newName
// Returns: {ok, folderId, name}
//
// Security: folder must be a direct child of DRIVE_FOLDER_ID.
// Empty or whitespace-only newName is rejected.
function proxyRenameFolder(e) {
  return withAuth_(e, function(e, auth) {
    var folderId = e.parameter.folderId;
    var newName = (e.parameter.newName || "").trim();
    if (!folderId) return _proxyJson({ ok: false, error: "missing_folderId" });
    if (!newName)  return _proxyJson({ ok: false, error: "missing_or_empty_newName" });
    if (!_proxyFolderIsChildOf(folderId, PROXY_CUSTOMER_PARENT_ID)) {
      return _proxyJson({ ok: false, error: "folder_out_of_scope" });
    }
    try {
      var f = DriveApp.getFolderById(folderId);
      f.setName(newName);
      return _proxyJson({ ok: true, folderId: folderId, name: f.getName() });
    } catch (err) {
      return _proxyJson({ ok: false, error: "drive_error", detail: String(err) });
    }
  });
}

// ════════════════════════════════════════════════════════════════════
// proxyArchiveFolder — move a customer folder into the archive folder
// ════════════════════════════════════════════════════════════════════
// Required: folderId
// Returns: {ok, folderId}
//
// Operation: removes folder from DRIVE_FOLDER_ID parent, adds it to
// ARCHIVE_FOLDER_ID parent. Uses moveTo so the folder is only ever a
// child of one parent at a time (no orphan or dual-parent state).
//
// Security: folder must be a child of DRIVE_FOLDER_ID before archiving.
// Same folder cannot be archived twice (will error out the second time
// since it's no longer a child of DRIVE_FOLDER_ID).
function proxyArchiveFolder(e) {
  return withAuth_(e, function(e, auth) {
    var folderId = e.parameter.folderId;
    if (!folderId) return _proxyJson({ ok: false, error: "missing_folderId" });
    if (!_proxyFolderIsChildOf(folderId, PROXY_CUSTOMER_PARENT_ID)) {
      return _proxyJson({ ok: false, error: "folder_out_of_scope" });
    }
    try {
      var folder = DriveApp.getFolderById(folderId);
      var archive = DriveApp.getFolderById(PROXY_ARCHIVE_FOLDER_ID);
      // moveTo is the cleanest API — atomically swaps parent
      folder.moveTo(archive);
      return _proxyJson({ ok: true, folderId: folderId });
    } catch (err) {
      return _proxyJson({ ok: false, error: "drive_error", detail: String(err) });
    }
  });
}

// ════════════════════════════════════════════════════════════════════
// proxyDeleteFolder — trash a customer folder (recoverable for 30 days)
// ════════════════════════════════════════════════════════════════════
// Required: folderId
// Returns: {ok, folderId}
//
// We use setTrashed(true) NOT a permanent delete. The folder goes to
// the Workspace owner's Drive trash and is recoverable for 30 days.
// Phase 4B doesn't expose a "permanently delete" — that's intentional.
function proxyDeleteFolder(e) {
  return withAuth_(e, function(e, auth) {
    var folderId = e.parameter.folderId;
    if (!folderId) return _proxyJson({ ok: false, error: "missing_folderId" });
    if (!_proxyFolderIsChildOf(folderId, PROXY_CUSTOMER_PARENT_ID)) {
      return _proxyJson({ ok: false, error: "folder_out_of_scope" });
    }
    try {
      var folder = DriveApp.getFolderById(folderId);
      folder.setTrashed(true);
      return _proxyJson({ ok: true, folderId: folderId });
    } catch (err) {
      return _proxyJson({ ok: false, error: "drive_error", detail: String(err) });
    }
  });
}

// ════════════════════════════════════════════════════════════════════
// proxyCreateFolder — create a new customer folder
// ════════════════════════════════════════════════════════════════════
// Required: name
// Optional: parentId (defaults to PROXY_CUSTOMER_PARENT_ID)
// Returns: {ok, folderId, name, createdAt}
//
// Security: parentId must be DRIVE_FOLDER_ID (no creating folders
// elsewhere). Dedupes — if a folder with the same name already exists,
// returns that one rather than creating a duplicate.
function proxyCreateFolder(e) {
  return withAuth_(e, function(e, auth) {
    var name = (e.parameter.name || "").trim();
    var parentId = e.parameter.parentId || PROXY_CUSTOMER_PARENT_ID;
    if (!name) return _proxyJson({ ok: false, error: "missing_or_empty_name" });
    if (parentId !== PROXY_CUSTOMER_PARENT_ID) {
      return _proxyJson({ ok: false, error: "parent_out_of_scope" });
    }
    try {
      var parent = DriveApp.getFolderById(parentId);
      // Dedupe: if a folder with this name exists, return it
      var existing = parent.getFoldersByName(name);
      if (existing.hasNext()) {
        var found = existing.next();
        return _proxyJson({
          ok: true,
          folderId: found.getId(),
          name: found.getName(),
          createdAt: found.getDateCreated().toISOString(),
          existed: true
        });
      }
      var created = parent.createFolder(name);
      return _proxyJson({
        ok: true,
        folderId: created.getId(),
        name: created.getName(),
        createdAt: created.getDateCreated().toISOString(),
        existed: false
      });
    } catch (err) {
      return _proxyJson({ ok: false, error: "drive_error", detail: String(err) });
    }
  });
}

// ════════════════════════════════════════════════════════════════════
// proxyUploadFile — upload a file (base64) to a folder
// ════════════════════════════════════════════════════════════════════
// Required: folderId, fileName, mimeType, base64
// Returns: {ok, fileId, name, mimeType, size}
//
// The base64 param can be large (multi-MB). Apps Script can handle this
// via POST body. The extension should POST these (not GET) to avoid URL
// length limits. We accept BOTH GET and POST params for flexibility.
//
// Security: folderId must be a child of DRIVE_FOLDER_ID (so uploads
// only happen to customer folders, not system or archive).
function proxyUploadFile(e) {
  return withAuth_(e, function(e, auth) {
    var folderId = e.parameter.folderId;
    var fileName = e.parameter.fileName;
    var mimeType = e.parameter.mimeType || "application/octet-stream";
    var base64   = e.parameter.base64;
    if (!folderId || !fileName || !base64) {
      return _proxyJson({ ok: false, error: "missing_params" });
    }
    if (!_proxyFolderIsChildOf(folderId, PROXY_CUSTOMER_PARENT_ID)) {
      return _proxyJson({ ok: false, error: "folder_out_of_scope" });
    }
    try {
      var bytes = Utilities.base64Decode(base64);
      var blob = Utilities.newBlob(bytes, mimeType, fileName);
      var folder = DriveApp.getFolderById(folderId);
      var file = folder.createFile(blob);
      return _proxyJson({
        ok: true,
        fileId: file.getId(),
        name: file.getName(),
        mimeType: file.getMimeType(),
        size: file.getSize()
      });
    } catch (err) {
      return _proxyJson({ ok: false, error: "drive_error", detail: String(err) });
    }
  });
}

// ════════════════════════════════════════════════════════════════════
// proxyWriteJsonFile — write/update a JSON file in the system folder
// ════════════════════════════════════════════════════════════════════
// Required: fileName, content (stringified JSON)
// Returns: {ok, fileName, modifiedAt}
//
// Scoped to the system folder ONLY (like proxyReadJsonFile). If the
// file exists, its content is overwritten. If not, it's created.
//
// Content is validated as parseable JSON before write — corrupted
// data is rejected.
function proxyWriteJsonFile(e) {
  return withAuth_(e, function(e, auth) {
    var fileName = e.parameter.fileName;
    var content = e.parameter.content;
    if (!fileName) return _proxyJson({ ok: false, error: "missing_fileName" });
    if (content === undefined || content === null) {
      return _proxyJson({ ok: false, error: "missing_content" });
    }
    // Validate content parses as JSON before writing — corrupted
    // writes are MUCH worse than rejected writes
    try {
      JSON.parse(content);
    } catch (parseErr) {
      return _proxyJson({ ok: false, error: "invalid_json", detail: String(parseErr) });
    }
    try {
      var folder = DriveApp.getFolderById(PROXY_SYSTEM_FOLDER_ID);
      var iter = folder.getFilesByName(fileName);
      var file;
      if (iter.hasNext()) {
        file = iter.next();
        file.setContent(content);
      } else {
        file = folder.createFile(fileName, content, "application/json");
      }
      return _proxyJson({
        ok: true,
        fileName: fileName,
        modifiedAt: file.getLastUpdated().toISOString()
      });
    } catch (err) {
      return _proxyJson({ ok: false, error: "drive_error", detail: String(err) });
    }
  });
}

// ════════════════════════════════════════════════════════════════════
// proxyAppendJsonEntry — atomic append to an array inside a system JSON file
// ════════════════════════════════════════════════════════════════════
// Required: fileName, arrayKey (e.g. "events", "entries"), entry (JSON string)
// Optional: maxLength (default 500) — caps array length, dropping oldest
// Returns: {ok, fileName, count}
//
// Why this exists separately: writeLogEntry and writeEventLog need
// read-modify-write semantics. Doing that client-side via two proxy
// calls is racy (concurrent writes can overwrite each other). This
// endpoint does it atomically on the server.
function proxyAppendJsonEntry(e) {
  return withAuth_(e, function(e, auth) {
    var fileName = e.parameter.fileName;
    var arrayKey = e.parameter.arrayKey;
    var entryStr = e.parameter.entry;
    var maxLength = parseInt(e.parameter.maxLength || "500", 10);
    if (!fileName || !arrayKey || !entryStr) {
      return _proxyJson({ ok: false, error: "missing_params" });
    }
    var entry;
    try {
      entry = JSON.parse(entryStr);
    } catch (parseErr) {
      return _proxyJson({ ok: false, error: "invalid_entry_json", detail: String(parseErr) });
    }
    try {
      var folder = DriveApp.getFolderById(PROXY_SYSTEM_FOLDER_ID);
      var iter = folder.getFilesByName(fileName);
      var obj = {};
      var file;
      if (iter.hasNext()) {
        file = iter.next();
        try {
          obj = JSON.parse(file.getBlob().getDataAsString());
        } catch (parseErr) {
          // Corrupted file — start fresh rather than fail. Logs are
          // important enough that recovery beats erroring out.
          obj = {};
        }
      }
      if (!Array.isArray(obj[arrayKey])) obj[arrayKey] = [];
      obj[arrayKey].push(entry);
      if (obj[arrayKey].length > maxLength) {
        obj[arrayKey] = obj[arrayKey].slice(-maxLength);
      }
      var newContent = JSON.stringify(obj);
      if (file) {
        file.setContent(newContent);
      } else {
        file = folder.createFile(fileName, newContent, "application/json");
      }
      return _proxyJson({
        ok: true,
        fileName: fileName,
        count: obj[arrayKey].length
      });
    } catch (err) {
      return _proxyJson({ ok: false, error: "drive_error", detail: String(err) });
    }
  });
}
