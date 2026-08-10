/**
 * dataroom-tracker.js — PostHog tracking for the SNØCAP data room.
 *
 * The deck's counterpart (public/deck/deck-tracker.js) with the data room's
 * shape: there are no slides, so what matters is which FILES a viewer opened
 * and how long they stayed. Emits:
 *   - dataroom_loaded once on init
 *   - dataroom_folder_opened on each folder navigation
 *   - dataroom_file_downloaded when a file is opened (the API streams it, so
 *     opening it IS taking it)
 *   - dataroom_exit on pagehide, with totals
 *
 * The `dataroom_id` super property is what routes these to the data-room half
 * of the ingestion (src/api/routes/posthog.ts → classifySource), so it must be
 * registered before the first capture.
 *
 * Identity: the `dataroom_viewer` gate cookie is HttpOnly (unlike the deck's),
 * so this can't read the email out of it. /dataroom/api/me returns the email the
 * gate already verified for this request — one fetch, and the cookie stays
 * unreadable to scripts.
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
  var filesTouched = 0;
  var foldersOpened = 0;

  posthog.register({ dataroom_id: dataroomId });

  // Identify BEFORE the first capture where possible, so the load event lands on
  // the identified person rather than an anonymous one that later merges. The
  // fetch is async, so dataroom_loaded is emitted from its completion — and
  // still emitted if the call fails, just anonymously (an event we can see in
  // PostHog beats no event because identification broke).
  function start(email) {
    if (email) posthog.identify(email);
    posthog.capture("dataroom_loaded", { dataroom_id: dataroomId });
  }

  fetch("/dataroom/api/me", { credentials: "same-origin" })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (body) {
      start(body && body.email ? body.email : null);
    })
    .catch(function () {
      start(null);
    });

  // app.js announces navigation; this file only listens. Keeping the tracker off
  // app.js's internals means a change to the file browser can't silently break
  // tracking (and vice versa).
  document.addEventListener("dataroom:file", function (e) {
    var detail = e.detail || {};
    filesTouched++;
    posthog.capture("dataroom_file_downloaded", {
      dataroom_id: dataroomId,
      file_id: detail.id,
      file_name: detail.name,
      mime_type: detail.mimeType,
    });
  });

  document.addEventListener("dataroom:folder", function (e) {
    var detail = e.detail || {};
    foldersOpened++;
    posthog.capture("dataroom_folder_opened", {
      dataroom_id: dataroomId,
      folder_id: detail.id,
      folder_name: detail.name,
    });
  });

  window.addEventListener("pagehide", function () {
    posthog.capture("dataroom_exit", {
      dataroom_id: dataroomId,
      total_seconds: Math.round((Date.now() - loadedAt) / 1000),
      files_downloaded: filesTouched,
      folders_opened: foldersOpened,
    });
  });
})();
