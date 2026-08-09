/**
 * dataroom-tracker.js — PostHog tracking for the SNØCAP Fund 2 Data Room.
 *
 * The data room counterpart to deck-tracker.js: same PostHog project, same
 * /track proxy, same shape of session (a load, a series of moves, an exit).
 *
 * Emits:
 *   - $pageview on load (default)
 *   - dataroom_loaded once, after the viewer is identified
 *   - dataroom_folder_opened on every folder navigation, including Back
 *   - dataroom_folder_dwell when leaving a folder, with seconds spent
 *   - dataroom_file_opened when a file is opened or downloaded
 *   - dataroom_exit on pagehide, with session totals
 *
 * WHAT THIS DELIBERATELY DOES NOT SEND: folder names, file names, and the
 * breadcrumb trail. The room's contents are confidential LP material and the
 * names alone give most of it away. Every event carries Drive ids instead,
 * which anyone with access to the room can resolve back to a name, plus a
 * generic file type ("PDF", "Google Sheet") so a rollup reads without a
 * lookup. The URL hash is ids too, so $current_url leaks nothing either.
 *
 * app.js does the navigating and dispatches `dataroomnavigate` /
 * `dataroomfileopen` on document; this file is the only one that knows about
 * PostHog, the same split as deck-stage.js and deck-tracker.js.
 */
(function () {
  if (!window.posthog || !window.__POSTHOG_KEY) return;

  posthog.init(window.__POSTHOG_KEY, {
    api_host: "/track",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    capture_dead_clicks: false,
    autocapture: false,
    disable_session_recording: true,
    advanced_disable_feature_flags: true,
    advanced_disable_feature_flags_on_first_load: true,
    advanced_disable_decide: true,
    enable_heatmaps: false,
  });

  var dataroomId = "snocap-fund-2";
  var loadedAt = Date.now();

  var folderEnteredAt = null;
  var currentFolderId = null;
  var currentDepth = 0;
  var maxDepth = 0;
  var foldersOpened = {};
  var filesOpened = 0;

  // Nothing is sent until we know who the viewer is: an anonymous
  // dataroom_loaded would open a session that never resolves to a person, and
  // the CRM rollup keys off the identified email. Events raised in the
  // meantime queue here and flush in order.
  var identified = false;
  var pending = [];

  function track(name, props) {
    if (!identified) {
      pending.push([name, props]);
      return;
    }
    posthog.capture(name, props);
  }

  function flush() {
    identified = true;
    for (var i = 0; i < pending.length; i++) {
      posthog.capture(pending[i][0], pending[i][1]);
    }
    pending = [];
  }

  // The gate cookie is HttpOnly here (unlike the deck's), so the email comes
  // from the worker instead of document.cookie. A failure still starts the
  // session — an anonymous visit in PostHog beats no visit at all.
  function identifyViewer() {
    return fetch("/dataroom/api/viewer", { credentials: "same-origin" })
      .then(function (resp) {
        return resp.ok ? resp.json() : null;
      })
      .then(function (data) {
        if (data && data.email) posthog.identify(data.email);
      })
      .catch(function () {})
      .then(function () {
        posthog.register({ dataroom_id: dataroomId });
        flush();
      });
  }

  function flushDwell() {
    if (currentFolderId === null || folderEnteredAt === null) return;
    var seconds = Math.round((Date.now() - folderEnteredAt) / 1000);
    if (seconds <= 0) return;
    track("dataroom_folder_dwell", {
      dataroom_id: dataroomId,
      folder_id: currentFolderId,
      depth: currentDepth,
      seconds: seconds,
    });
  }

  function onNavigate(detail) {
    flushDwell();

    // "root" rather than null so the property is always a string and the root
    // groups like any other folder.
    currentFolderId = detail.folderId || "root";
    currentDepth = typeof detail.depth === "number" ? detail.depth : 0;
    if (currentDepth > maxDepth) maxDepth = currentDepth;
    folderEnteredAt = Date.now();
    foldersOpened[currentFolderId] = true;

    track("dataroom_folder_opened", {
      dataroom_id: dataroomId,
      folder_id: currentFolderId,
      depth: currentDepth,
      is_root: currentDepth === 0,
    });
  }

  function onFileOpen(detail) {
    filesOpened++;
    track("dataroom_file_opened", {
      dataroom_id: dataroomId,
      file_id: detail.fileId,
      file_type: detail.fileType || null,
      folder_id: currentFolderId,
      depth: currentDepth,
    });
  }

  document.addEventListener("dataroomnavigate", function (e) {
    onNavigate(e.detail || {});
  });

  document.addEventListener("dataroomfileopen", function (e) {
    onFileOpen(e.detail || {});
  });

  window.addEventListener("pagehide", function () {
    flushDwell();
    track("dataroom_exit", {
      dataroom_id: dataroomId,
      total_seconds: Math.round((Date.now() - loadedAt) / 1000),
      folders_opened: Object.keys(foldersOpened).length,
      files_opened: filesOpened,
      max_depth: maxDepth,
    });
  });

  track("dataroom_loaded", { dataroom_id: dataroomId });
  identifyViewer();
})();
