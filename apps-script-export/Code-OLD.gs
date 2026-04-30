// ============================================================
// DealerScan / Scan Docs — Apps Script (OLD, from suspended account)
// Backed up: 2026-04-30
// Source: pasted by Brandon in chat 2026-04-29
// Purpose: Reference for migration. Do NOT deploy as-is.
// Pre-deploy changes required:
//   1. Move VISION_API_KEY to PropertiesService.getScriptProperties()
//   2. Apply Quinn's bug fixes:
//      - Q-A: getDashConfig duplicates clash with web app endpoint — wrap auto-discovery in json() for HTTP path
//      - Q-B: logScanComplete has a no-op col-8 write that races with incrementPhotoCount — delete it
//      - Q-C: archiveDailyFolders archives unconditionally — rename to archiveAllFoldersDangerous or delete
//   3. Update folder ID constants at top to point at new Workspace Drive resources
// ============================================================

const PARENT_FOLDER_ID  = "1EWpweROWyqNebPL52I0Z5f2J4MKjnmFg";
const ARCHIVE_FOLDER_ID = "1YnY_G7icV7iV4gj3N4_cpthfyRd5HyeO";
const SYSTEM_FOLDER_ID  = "1fiT1EmoPNdgfh5AEMyuy2GdV4aA9fZXU";
const HISTORY_SHEET_ID  = "1GTJGE0vABP_8qhqyQ4hKMFvD64QUxllm6hQk1UHe9pM";
const HISTORY_SHEET_NAME = "CustomerHistory";
const MAX_HISTORY = 5;
const VISION_API_KEY   = "AIzaSyAoTv6xN3u9YJ3LPNiReqepDxmSsivVZTw"; // ⚠️ MOVE TO PropertiesService BEFORE DEPLOY
const CONFIG_FILE_NAME = "_DealerScan_Config.json";
const LOG_FILE_NAME    = "_DealerScan_Log.json";
const EVENTS_FILE_NAME = "_DealerScan_Events.json";

// ============================================================
// NOTE: Full Code.gs body lives in chat history (2026-04-29 paste).
// During Phase 4 of migration, Aria will produce a clean fixed version
// with the three bug fixes applied and Vision API key extracted.
// That clean version will be saved to:
//   ../apps-script-export/Code-NEW.gs
// before paste into the new Apps Script project.
// ============================================================
