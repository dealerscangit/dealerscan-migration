// ════════════════════════════════════════════════════════════════════
// Phase 4B.2 — Drive proxy endpoints (Read-only)
// Added 2026-05-02 by Brandon + Aria/team
//
// Every endpoint here is gated by withAuth_() from Auth.gs. The Apps Script
// Web App runs as the Workspace owner (tgchevydocs@dealerscanapp.com), so
// these proxies let authenticated users perform Drive operations against
// folders they don't have direct access to — without ever sharing those
// folders externally.
//
// All endpoints return JSON. Response shape on success: {ok:true, ...data}.
// Response shape on auth failure: {ok:false, error, email}.
// Response shape on operation failure: {ok:false, error}.
//
// Write endpoints (rename/delete) are deferred to Phase 4B.2-write.
// ════════════════════════════════════════════════════════════════════

var PROXY_SYSTEM_FOLDER_ID = "1Zb8LUDFD_MA5yD_T3d34kBgCigJj6a7B";

/**
 * proxyListFolders — list child folders of a parent folder.
 * Required: parentId
 * Returns: {ok, folders: [{id, name, createdAt, modifiedAt}]}
 */
function proxyListFolders(e) {
  return withAuth_(e, function(e, auth) {
    var parentId = e.parameter.parentId;
    if (!parentId) {
      return _proxyJson({ ok: false, error: "missing_parentId" });
    }
    try {
      var parent = DriveApp.getFolderById(parentId);
      var iter = parent.getFolders();
      var out = [];
      while (iter.hasNext()) {
        var f = iter.next();
        out.push({
          id: f.getId(),
          name: f.getName(),
          createdAt: f.getDateCreated().toISOString(),
          modifiedAt: f.getLastUpdated().toISOString()
        });
      }
      return _proxyJson({ ok: true, folders: out, count: out.length });
    } catch (err) {
      return _proxyJson({ ok: false, error: "drive_error", detail: String(err) });
    }
  });
}

/**
 * proxyListFiles — list files inside a folder (does NOT recurse).
 * Required: folderId
 * Returns: {ok, files: [{id, name, mimeType, size, modifiedAt}]}
 */
function proxyListFiles(e) {
  return withAuth_(e, function(e, auth) {
    var folderId = e.parameter.folderId;
    if (!folderId) {
      return _proxyJson({ ok: false, error: "missing_folderId" });
    }
    try {
      var folder = DriveApp.getFolderById(folderId);
      var iter = folder.getFiles();
      var out = [];
      while (iter.hasNext()) {
        var f = iter.next();
        out.push({
          id: f.getId(),
          name: f.getName(),
          mimeType: f.getMimeType(),
          size: f.getSize(),
          modifiedAt: f.getLastUpdated().toISOString()
        });
      }
      return _proxyJson({ ok: true, files: out, count: out.length });
    } catch (err) {
      return _proxyJson({ ok: false, error: "drive_error", detail: String(err) });
    }
  });
}

/**
 * proxyReadFile — return a file's content as base64.
 * Required: fileId
 * Returns: {ok, fileId, name, mimeType, size, base64}
 */
function proxyReadFile(e) {
  return withAuth_(e, function(e, auth) {
    var fileId = e.parameter.fileId;
    if (!fileId) {
      return _proxyJson({ ok: false, error: "missing_fileId" });
    }
    try {
      var f = DriveApp.getFileById(fileId);
      var blob = f.getBlob();
      var bytes = blob.getBytes();
      var b64 = Utilities.base64Encode(bytes);
      return _proxyJson({
        ok: true,
        fileId: fileId,
        name: f.getName(),
        mimeType: f.getMimeType(),
        size: f.getSize(),
        base64: b64
      });
    } catch (err) {
      return _proxyJson({ ok: false, error: "drive_error", detail: String(err) });
    }
  });
}

/**
 * proxyGetFile — metadata only (no content). Used for thumbnails / mod time checks.
 * Required: fileId
 * Returns: {ok, fileId, name, mimeType, size, createdAt, modifiedAt, thumbnailLink?}
 */
function proxyGetFile(e) {
  return withAuth_(e, function(e, auth) {
    var fileId = e.parameter.fileId;
    if (!fileId) {
      return _proxyJson({ ok: false, error: "missing_fileId" });
    }
    try {
      var f = DriveApp.getFileById(fileId);
      return _proxyJson({
        ok: true,
        fileId: fileId,
        name: f.getName(),
        mimeType: f.getMimeType(),
        size: f.getSize(),
        createdAt: f.getDateCreated().toISOString(),
        modifiedAt: f.getLastUpdated().toISOString()
      });
    } catch (err) {
      return _proxyJson({ ok: false, error: "drive_error", detail: String(err) });
    }
  });
}

/**
 * proxyFindFolder — find a folder by name within a parent. Used for dedup before create.
 * Required: parentId, name
 * Returns: {ok, found:bool, folder?:{id,name}}
 */
function proxyFindFolder(e) {
  return withAuth_(e, function(e, auth) {
    var parentId = e.parameter.parentId;
    var name = e.parameter.name;
    if (!parentId || !name) {
      return _proxyJson({ ok: false, error: "missing_parentId_or_name" });
    }
    try {
      var parent = DriveApp.getFolderById(parentId);
      var iter = parent.getFoldersByName(name);
      if (iter.hasNext()) {
        var f = iter.next();
        return _proxyJson({
          ok: true,
          found: true,
          folder: { id: f.getId(), name: f.getName() }
        });
      }
      return _proxyJson({ ok: true, found: false });
    } catch (err) {
      return _proxyJson({ ok: false, error: "drive_error", detail: String(err) });
    }
  });
}

/**
 * proxyReadJsonFile — read a named JSON file from the system folder.
 * Required: fileName  (e.g. "_DealerScan_Config.json")
 * Returns: {ok, fileName, parsed:Object, modifiedAt}
 *
 * Scoped to the system folder ONLY — does not accept arbitrary parent IDs
 * to prevent exfiltration of JSON files placed in customer folders.
 */
function proxyReadJsonFile(e) {
  return withAuth_(e, function(e, auth) {
    var fileName = e.parameter.fileName;
    if (!fileName) {
      return _proxyJson({ ok: false, error: "missing_fileName" });
    }
    try {
      var folder = DriveApp.getFolderById(PROXY_SYSTEM_FOLDER_ID);
      var iter = folder.getFilesByName(fileName);
      if (!iter.hasNext()) {
        return _proxyJson({ ok: false, error: "file_not_found", fileName: fileName });
      }
      var f = iter.next();
      var content = f.getBlob().getDataAsString();
      var parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseErr) {
        return _proxyJson({ ok: false, error: "json_parse_failed", detail: String(parseErr) });
      }
      return _proxyJson({
        ok: true,
        fileName: fileName,
        parsed: parsed,
        modifiedAt: f.getLastUpdated().toISOString()
      });
    } catch (err) {
      return _proxyJson({ ok: false, error: "drive_error", detail: String(err) });
    }
  });
}

// Local JSON helper (named with underscore prefix to avoid collision with json() in Code.gs)
function _proxyJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
