// ════════════════════════════════════════════════════════════════════
// Auth helper for Phase 4B service-account proxy
// Added 2026-05-02 by Brandon + Aria/team
//
// Purpose: every new "proxy" endpoint that performs Drive operations on
// the Workspace's behalf MUST call withAuth_() to verify the caller is
// allowed. The Apps Script Web App runs as the Workspace owner, so without
// this gate, anyone with the URL could invoke any function.
//
// Pattern:
//   function proxyListFolders(e) {
//     return withAuth_(e, function(e, auth) {
//       // auth.email and auth.role are verified at this point
//       ... do Drive work ...
//       return json({ ok: true, folders: [...] });
//     });
//   }
//
// The extension sends its OAuth ACCESS token (already obtained via
// chrome.identity.getAuthToken). We hit Google's userinfo endpoint
// to verify the token + extract the email. No ID-token complexity.
// ════════════════════════════════════════════════════════════════════

// Bootstrap allowlist: hardcoded so first-ever request can't get locked out.
// Anyone in this list is always allowed regardless of _DealerScan_Users.json state.
// Add additional users via the user file once it exists; bootstrap is the safety net.
var BOOTSTRAP_USERS = [
  { email: "tgchevydocs@dealerscanapp.com", role: "IT", name: "Workspace Owner" },
  { email: "brandonbusler@gmail.com",       role: "IT", name: "Brandon" }
];

// System folder where _DealerScan_Users.json lives (or will live).
var AUTH_SYSTEM_FOLDER_ID = "1Zb8LUDFD_MA5yD_T3d34kBgCigJj6a7B";

/**
 * Verify a caller's access token. Returns { ok, email, role, name } or
 * { ok:false, error, status, email? } with details.
 */
function verifyCaller_(accessToken) {
  if (!accessToken) {
    return { ok: false, error: "missing_access_token", status: 401 };
  }

  // Step 1: hit Google's userinfo endpoint with the token
  // If the token is invalid/expired/revoked, this returns non-200.
  var url = "https://www.googleapis.com/oauth2/v3/userinfo";
  var resp;
  try {
    resp = UrlFetchApp.fetch(url, {
      headers: { Authorization: "Bearer " + accessToken },
      muteHttpExceptions: true
    });
  } catch (e) {
    return { ok: false, error: "userinfo_fetch_failed", status: 502 };
  }

  if (resp.getResponseCode() !== 200) {
    return { ok: false, error: "invalid_access_token", status: 401 };
  }

  var info;
  try {
    info = JSON.parse(resp.getContentText());
  } catch (e) {
    return { ok: false, error: "userinfo_parse_failed", status: 502 };
  }

  // Step 2: verify email is verified by Google
  if (!info.email_verified) {
    return { ok: false, error: "email_not_verified", status: 403 };
  }

  var email = (info.email || "").toLowerCase();
  if (!email) {
    return { ok: false, error: "no_email_in_token", status: 403 };
  }

  // Step 3: bootstrap users always allowed (no chicken-and-egg)
  for (var i = 0; i < BOOTSTRAP_USERS.length; i++) {
    if (BOOTSTRAP_USERS[i].email.toLowerCase() === email) {
      return {
        ok: true,
        email: email,
        role: BOOTSTRAP_USERS[i].role,
        name: BOOTSTRAP_USERS[i].name
      };
    }
  }

  // Step 4: check the user file for everyone else
  var users = loadAllowlistUsers_();
  for (var j = 0; j < users.length; j++) {
    if (users[j].email && users[j].email.toLowerCase() === email) {
      return {
        ok: true,
        email: email,
        role: users[j].role || "salesperson",
        name: users[j].name || ""
      };
    }
  }

  // Not in bootstrap, not in user file → reject with email so caller can self-identify
  return { ok: false, error: "not_in_allowlist", status: 403, email: email };
}

/**
 * Load the user allowlist from _DealerScan_Users.json. If file doesn't exist
 * or is corrupted, return empty array (caller falls back to bootstrap-only).
 */
function loadAllowlistUsers_() {
  var folder = DriveApp.getFolderById(AUTH_SYSTEM_FOLDER_ID);
  var files = folder.getFilesByName("_DealerScan_Users.json");
  if (!files.hasNext()) return [];
  try {
    var parsed = JSON.parse(files.next().getBlob().getDataAsString());
    return parsed.users || [];
  } catch (e) {
    // File exists but is corrupted — fail closed (return empty list)
    return [];
  }
}

/**
 * Wrapper that every new proxy endpoint uses. Standardizes auth-fail responses.
 * Accepts accessToken from either ?accessToken=... query param or POST body.
 *
 * Usage:
 *   function myProxyEndpoint(e) {
 *     return withAuth_(e, function(e, auth) {
 *       // auth.email, auth.role, auth.name are verified
 *       return json({ ok: true, ... });
 *     });
 *   }
 */
function withAuth_(e, handler) {
  var accessToken = (e.parameter && e.parameter.accessToken) || null;
  if (!accessToken && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      accessToken = body.accessToken || null;
    } catch (err) {
      // ignore parse failures; token may have come from query string
    }
  }

  var auth = verifyCaller_(accessToken);
  if (!auth.ok) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: auth.error,
        email: auth.email || null
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return handler(e, auth);
}

// ════════════════════════════════════════════════════════════════════
// SMOKE-TEST ENDPOINT for verifying the auth helper works end-to-end.
// Hit ?action=authPing&accessToken=<your_token> after deploying.
// Returns {ok:true, email, role, name} if everything's wired up right.
// ════════════════════════════════════════════════════════════════════

function authPing(e) {
  return withAuth_(e, function(e, auth) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        message: "auth helper works",
        email: auth.email,
        role: auth.role,
        name: auth.name,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  });
}
